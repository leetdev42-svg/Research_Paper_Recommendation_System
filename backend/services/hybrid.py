import os
from typing import List, Dict, Optional, Tuple
from models.schemas import Paper, RecommendationItem, RankingEvaluation
from services.paper_service import PaperService
from services.content_based import ContentBasedRecommender
from services.collaborative import CollaborativeFilteringService
from services.ranking import RankingEvaluator


class HybridRecommender:
    """
    Hybrid Recommendation Engine.
    Combines Content-Based Filtering and Collaborative Filtering scores into a unified ranked list.
    Weights are configurable via parameters or environment variables.
    """

    def __init__(
        self,
        paper_service: PaperService,
        content_recommender: ContentBasedRecommender,
        collaborative_service: CollaborativeFilteringService,
        default_content_weight: Optional[float] = None,
        default_collaborative_weight: Optional[float] = None,
    ):
        self.paper_service = paper_service
        self.content_recommender = content_recommender
        self.collaborative_service = collaborative_service

        env_cw = os.getenv("DEFAULT_CONTENT_WEIGHT")
        env_cfw = os.getenv("DEFAULT_COLLABORATIVE_WEIGHT")

        self.default_content_weight = (
            default_content_weight
            if default_content_weight is not None
            else (float(env_cw) if env_cw else 0.7)
        )
        self.default_collaborative_weight = (
            default_collaborative_weight
            if default_collaborative_weight is not None
            else (float(env_cfw) if env_cfw else 0.3)
        )

    def _generate_why_this_paper(
        self,
        paper: Paper,
        query: str,
        content_score: float,
        collaborative_score: float,
        user_has_history: bool,
    ) -> str:
        """
        Generates a human-interpretable rationale without exposing complex internal algorithms.
        """
        if user_has_history and collaborative_score >= 0.75:
            return f"Recommended for you · Related to your saved research interests in {paper.category}."

        if content_score >= 0.65 and query:
            clean_q = query.strip()
            short_q = (clean_q[:36] + "...") if len(clean_q) > 36 else clean_q
            return f'Recommended for you · Strong semantic similarity to "{short_q}".'

        if collaborative_score > content_score:
            return "Recommended for you · Frequently studied by researchers with similar research topics."

        return f"Recommended for you · Highly relevant to {paper.category} literature."

    def recommend(
        self,
        query: str,
        user_id: Optional[str] = "user123",
        limit: int = 10,
        content_weight: Optional[float] = None,
        collaborative_weight: Optional[float] = None,
    ) -> Tuple[List[RecommendationItem], RankingEvaluation]:
        """
        Executes the hybrid recommendation pipeline:
        1. Computes content-based scores from query via TF-IDF cosine similarity.
        2. Computes collaborative scores from user interaction history and peer co-occurrence.
        3. Fuses scores using weighted linear combination.
        4. Evaluates rank concordance between content and collaborative scores using Spearman correlation.
        5. Returns ranked list of RecommendationItem objects + evaluation metadata.
        """
        df = self.paper_service.get_dataframe()
        all_paper_ids = [str(pid) for pid in df["id"].tolist()]

        if not all_paper_ids:
            return [], RankingEvaluation()

        # Resolve weights
        w_content = (
            content_weight
            if content_weight is not None
            else self.default_content_weight
        )
        w_collab = (
            collaborative_weight
            if collaborative_weight is not None
            else self.default_collaborative_weight
        )

        # Normalize weights to sum to 1.0
        total_w = w_content + w_collab
        if total_w > 0:
            w_content = w_content / total_w
            w_collab = w_collab / total_w
        else:
            w_content, w_collab = 0.7, 0.3

        # 1. Content-based scores
        content_score_map = self.content_recommender.get_content_score_dict(
            query=query,
            paper_ids=all_paper_ids,
        )

        # 2. Collaborative scores
        collab_score_map = self.collaborative_service.get_collaborative_scores(
            user_id=user_id,
            candidate_paper_ids=all_paper_ids,
        )

        # 3. Combine scores
        items: List[RecommendationItem] = []
        user_saved_ids = set(self.collaborative_service.get_user_saved_paper_ids(user_id or ""))
        user_has_history = len(user_saved_ids) > 0 or len(self.collaborative_service.get_user_interactions(user_id or "")) > 0

        content_scores_list: List[float] = []
        collab_scores_list: List[float] = []

        for pid in all_paper_ids:
            paper = self.paper_service.get_paper_by_id(pid)
            if not paper:
                continue

            c_score = content_score_map.get(pid, 0.0)
            collab_score = collab_score_map.get(pid, 0.5)

            # Final hybrid score calculation
            final_score = (w_content * c_score) + (w_collab * collab_score)

            content_scores_list.append(c_score)
            collab_scores_list.append(collab_score)

            why = self._generate_why_this_paper(
                paper=paper,
                query=query,
                content_score=c_score,
                collaborative_score=collab_score,
                user_has_history=user_has_history,
            )

            items.append(
                RecommendationItem(
                    paper=paper,
                    content_score=round(float(c_score), 4),
                    collaborative_score=round(float(collab_score), 4),
                    final_score=round(float(final_score), 4),
                    why_this_paper=why,
                )
            )

        # Sort descending by final hybrid score
        items.sort(key=lambda x: x.final_score, reverse=True)

        # Compute Spearman rank correlation between content and collaborative ranks
        eval_result = RankingEvaluator.evaluate_rankings(
            content_scores=content_scores_list,
            collaborative_scores=collab_scores_list,
        )

        top_results = items[:limit] if limit > 0 else items
        return top_results, eval_result
