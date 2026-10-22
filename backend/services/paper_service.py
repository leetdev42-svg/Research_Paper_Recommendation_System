import os
from pathlib import Path
from typing import List, Optional, Dict
import pandas as pd
from models.schemas import Paper
from utils.preprocessing import parse_comma_list


class PaperService:
    """
    Manages loading, indexing, and querying research paper records from the CSV repository.
    Keeps dataset loading isolated from recommendation and API controllers.
    """

    def __init__(self, csv_path: Optional[str] = None):
        if csv_path:
            self.csv_path = Path(csv_path)
        else:
            env_path = os.getenv("PAPERS_CSV_PATH", "data/papers.csv")
            # If relative, resolve relative to backend directory or working directory
            candidate_path = Path(env_path)
            if not candidate_path.is_absolute():
                base_dir = Path(__file__).resolve().parent.parent
                self.csv_path = base_dir / env_path
            else:
                self.csv_path = candidate_path

        self.df: pd.DataFrame = pd.DataFrame()
        self._paper_cache: Dict[str, Paper] = {}
        self.load_papers()

    def load_papers(self) -> pd.DataFrame:
        if not self.csv_path.exists():
            # Try alternate fallback locations
            fallbacks = [
                Path("data/papers.csv"),
                Path("backend/data/papers.csv"),
                Path(__file__).resolve().parent.parent / "data" / "papers.csv",
            ]
            found = False
            for fb in fallbacks:
                if fb.exists():
                    self.csv_path = fb
                    found = True
                    break
            if not found:
                raise FileNotFoundError(f"Research papers CSV not found at {self.csv_path}")

        # Read CSV
        df = pd.read_csv(self.csv_path, dtype={"id": str, "year": int})
        
        # Fill missing values
        df["title"] = df["title"].fillna("")
        df["abstract"] = df["abstract"].fillna("")
        df["authors"] = df["authors"].fillna("")
        df["keywords"] = df["keywords"].fillna("")
        df["category"] = df["category"].fillna("General")
        df["url"] = df["url"].fillna("")
        df["year"] = df["year"].fillna(2024).astype(int)

        self.df = df
        self._rebuild_cache()
        return self.df

    def _rebuild_cache(self) -> None:
        self._paper_cache = {}
        for _, row in self.df.iterrows():
            paper = Paper(
                id=str(row["id"]),
                title=str(row["title"]),
                authors=parse_comma_list(row["authors"]),
                abstract=str(row["abstract"]),
                year=int(row["year"]),
                keywords=parse_comma_list(row["keywords"]),
                category=str(row["category"]),
                url=str(row["url"]),
            )
            self._paper_cache[paper.id] = paper

    def get_dataframe(self) -> pd.DataFrame:
        return self.df

    def get_paper_by_id(self, paper_id: str) -> Optional[Paper]:
        return self._paper_cache.get(paper_id)

    def paper_exists(self, paper_id: str) -> bool:
        return paper_id in self._paper_cache

    def get_all_papers(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        year: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> List[Paper]:
        results = list(self._paper_cache.values())

        if category:
            cat_lower = category.lower().strip()
            results = [p for p in results if p.category.lower() == cat_lower]

        if year:
            results = [p for p in results if p.year == year]

        if search:
            query = search.lower().strip()
            results = [
                p
                for p in results
                if query in p.title.lower()
                or query in p.abstract.lower()
                or any(query in kw.lower() for kw in p.keywords)
                or any(query in a.lower() for a in p.authors)
            ]

        if limit and limit > 0:
            results = results[:limit]

        return results
