from typing import List, Tuple, Dict, Optional
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from utils.preprocessing import clean_text, combine_paper_text


class ContentBasedRecommender:
    """
    Content-Based Filtering Recommendation Service.
    Indexes textual fields (title, abstract, keywords, category) using TF-IDF.
    Computes cosine similarity between queries/papers and the corpus.
    Precomputes the TF-IDF matrix once on startup to maintain sub-millisecond response latency.
    """

    def __init__(self, papers_df: pd.DataFrame):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=10000,
            ngram_range=(1, 2),
            sublinear_tf=True,
        )
        self.paper_ids: List[str] = []
        self.id_to_idx: Dict[str, int] = {}
        self.tfidf_matrix = None
        self.fit(papers_df)

    def fit(self, papers_df: pd.DataFrame) -> None:
        """
        Fits the TF-IDF vectorizer and builds the persistent document-term matrix.
        """
        self.paper_ids = []
        self.id_to_idx = {}
        documents: List[str] = []

        for idx, row in papers_df.iterrows():
            paper_id = str(row["id"])
            doc_text = combine_paper_text(
                title=str(row.get("title", "")),
                abstract=str(row.get("abstract", "")),
                keywords=row.get("keywords", ""),
                category=str(row.get("category", "")),
            )
            documents.append(doc_text)
            self.paper_ids.append(paper_id)
            self.id_to_idx[paper_id] = len(self.paper_ids) - 1

        if documents:
            self.tfidf_matrix = self.vectorizer.fit_transform(documents)
        else:
            self.tfidf_matrix = None

    def recommend(
        self,
        query: str,
        top_k: int = 10,
        candidate_ids: Optional[List[str]] = None,
    ) -> List[Tuple[str, float]]:
        """
        Calculates cosine similarity between a user query and indexed papers.
        Returns a sorted list of (paper_id, content_similarity_score).
        """
        if self.tfidf_matrix is None or not self.paper_ids:
            return []

        processed_query = clean_text(query)
        if not processed_query:
            # If query is empty, return neutral baseline scores
            return [(pid, 0.5) for pid in self.paper_ids[:top_k]]

        query_vec = self.vectorizer.transform([processed_query])
        # Compute cosine similarity: shape (1, num_papers)
        sim_scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        results: List[Tuple[str, float]] = []
        candidate_set = set(candidate_ids) if candidate_ids else None

        for idx, pid in enumerate(self.paper_ids):
            if candidate_set is not None and pid not in candidate_set:
                continue
            score = float(sim_scores[idx])
            results.append((pid, score))

        # Sort descending by score
        results.sort(key=lambda x: x[1], reverse=True)

        if top_k is not None and top_k > 0:
            results = results[:top_k]

        return results

    def get_similar_papers(
        self,
        paper_id: str,
        top_k: int = 5,
    ) -> List[Tuple[str, float]]:
        """
        Calculates content similarity between a target paper and all other papers in the index.
        """
        if self.tfidf_matrix is None or paper_id not in self.id_to_idx:
            return []

        idx = self.id_to_idx[paper_id]
        paper_vec = self.tfidf_matrix[idx]
        sim_scores = cosine_similarity(paper_vec, self.tfidf_matrix).flatten()

        results: List[Tuple[str, float]] = []
        for p_idx, pid in enumerate(self.paper_ids):
            if pid == paper_id:
                continue
            results.append((pid, float(sim_scores[p_idx])))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def get_content_score_dict(
        self,
        query: str,
        paper_ids: List[str],
    ) -> Dict[str, float]:
        """
        Returns a dictionary mapping paper_id to its content score for the given query.
        """
        recommendations = self.recommend(query=query, top_k=len(self.paper_ids), candidate_ids=paper_ids)
        score_map = {pid: score for pid, score in recommendations}
        # Fill any missing candidates with 0.0
        for pid in paper_ids:
            if pid not in score_map:
                score_map[pid] = 0.0
        return score_map
