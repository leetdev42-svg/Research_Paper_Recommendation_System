import datetime
from typing import List, Dict, Optional, Tuple, Set
import numpy as np


class CollaborativeFilteringService:
    """
    Collaborative Filtering Service based on user-paper interaction data.
    Supports interaction events: 'view', 'save', 'like' with customizable action weights.
    Implements User-Based and Item-Based interaction matrix similarity.
    Maintains an in-memory interaction repository designed for seamless database migration.
    """

    INTERACTION_WEIGHTS = {
        "view": 1.0,
        "like": 2.5,
        "save": 4.0,
    }

    def __init__(self):
        # In-memory storage for MVP: list of interaction records
        self.interactions: List[Dict] = []
        self._user_interacted_papers: Dict[str, Dict[str, float]] = {}  # user_id -> {paper_id: total_weight}
        self._paper_interacted_users: Dict[str, Dict[str, float]] = {}  # paper_id -> {user_id: total_weight}
        self._seed_sample_interactions()

    def _seed_sample_interactions(self) -> None:
        """
        Seeds synthetic interactions representing a community of peer researchers,
        enabling collaborative filtering signals even before active user history accumulates.
        """
        seeds = [
            # Medical diagnosis & clinical AI cluster
            ("dr_chen", "paper001", "save"),
            ("dr_chen", "paper002", "like"),
            ("dr_chen", "paper003", "view"),
            ("dr_chen", "paper011", "save"),
            ("dr_chen", "paper012", "like"),
            
            ("oncology_researcher", "paper001", "like"),
            ("oncology_researcher", "paper003", "save"),
            ("oncology_researcher", "paper011", "save"),
            ("oncology_researcher", "paper014", "like"),
            ("oncology_researcher", "paper017", "save"),

            ("clinician_vance", "paper001", "save"),
            ("clinician_vance", "paper004", "save"),
            ("clinician_vance", "paper005", "like"),
            ("clinician_vance", "paper002", "view"),

            ("user123", "paper001", "save"),
            ("user123", "paper002", "view"),

            # Foundation models & deep learning cluster
            ("ai_scholar_mark", "paper007", "save"),
            ("ai_scholar_mark", "paper001", "like"),
            ("ai_scholar_mark", "paper004", "save"),
            ("ai_scholar_mark", "paper013", "save"),

            # Quantum computing cluster
            ("quantum_physicist", "paper008", "save"),
            ("quantum_physicist", "paper018", "save"),

            # Bio & molecular cluster
            ("bio_engineer", "paper009", "save"),
            ("bio_engineer", "paper015", "like"),
        ]

        for user_id, paper_id, action in seeds:
            self.record_interaction(user_id=user_id, paper_id=paper_id, interaction=action)

    def record_interaction(
        self,
        user_id: str,
        paper_id: str,
        interaction: str,
    ) -> Dict:
        """
        Records a new user interaction event and updates the affinity matrices.
        """
        normalized_action = interaction.lower().strip()
        weight = self.INTERACTION_WEIGHTS.get(normalized_action, 1.0)
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

        record = {
            "user_id": user_id,
            "paper_id": paper_id,
            "interaction": normalized_action,
            "weight": weight,
            "timestamp": timestamp,
        }
        self.interactions.append(record)

        # Update user lookup
        if user_id not in self._user_interacted_papers:
            self._user_interacted_papers[user_id] = {}
        self._user_interacted_papers[user_id][paper_id] = (
            self._user_interacted_papers[user_id].get(paper_id, 0.0) + weight
        )

        # Update paper lookup
        if paper_id not in self._paper_interacted_users:
            self._paper_interacted_users[paper_id] = {}
        self._paper_interacted_users[paper_id][user_id] = (
            self._paper_interacted_users[paper_id].get(user_id, 0.0) + weight
        )

        return record

    def get_user_interactions(self, user_id: str) -> List[Dict]:
        return [r for r in self.interactions if r["user_id"] == user_id]

    def get_user_saved_paper_ids(self, user_id: str) -> List[str]:
        """
        Returns list of paper IDs saved by the user (preserving most recent first, no duplicates).
        """
        saved: List[str] = []
        for r in reversed(self.interactions):
            if r["user_id"] == user_id and r["interaction"] == "save":
                if r["paper_id"] not in saved:
                    saved.append(r["paper_id"])
        return saved

    def get_paper_save_count(self, paper_id: str) -> int:
        """Returns the total number of times a paper has been saved by any user."""
        return sum(1 for r in self.interactions if r["paper_id"] == paper_id and r["interaction"] == "save")

    def get_collaborative_scores(
        self,
        user_id: Optional[str],
        candidate_paper_ids: List[str],
    ) -> Dict[str, float]:
        """
        Calculates collaborative filtering relevance scores for candidate papers.
        If the target user has interactions, computes peer researcher affinity.
        If user is new/anonymous, uses global co-interaction and popularity density.
        Explicitly prioritizes papers with higher save counts: more saves => higher relevance.
        Returns a dictionary mapping paper_id to normalized collaborative score in [0.0, 1.0].
        """
        score_map: Dict[str, float] = {}

        # 1. Base popularity signal across all papers
        max_paper_weight = 1.0
        paper_totals: Dict[str, float] = {}
        for pid in candidate_paper_ids:
            total_weight = sum(self._paper_interacted_users.get(pid, {}).values())
            paper_totals[pid] = total_weight
            if total_weight > max_paper_weight:
                max_paper_weight = total_weight

        # 2. Save volume across candidate papers
        save_counts = {pid: self.get_paper_save_count(pid) for pid in candidate_paper_ids}
        max_saves = max(save_counts.values()) if save_counts and max(save_counts.values()) > 0 else 1

        # 3. Check if user has personal interaction history
        user_history = self._user_interacted_papers.get(user_id, {}) if user_id else {}

        if not user_history:
            # Cold-start fallback: normalize global peer popularity signal + save count boost into [0.45, 0.98]
            for pid in candidate_paper_ids:
                rel_pop = paper_totals.get(pid, 0.0) / max_paper_weight
                rel_saves = save_counts.get(pid, 0) / max_saves
                score_map[pid] = float(np.clip(0.40 + (0.35 * rel_pop) + (0.23 * rel_saves), 0.40, 0.98))
            return score_map

        # 4. Item-to-Item / User-to-User similarity based on interaction overlap
        # Calculate peer user similarities
        target_papers: Set[str] = set(user_history.keys())
        user_similarities: Dict[str, float] = {}

        for other_user, other_papers in self._user_interacted_papers.items():
            if other_user == user_id:
                continue
            common = target_papers.intersection(other_papers.keys())
            if not common:
                continue

            # Cosine similarity between user interaction weight vectors
            dot_product = sum(user_history[p] * other_papers[p] for p in common)
            norm_a = np.sqrt(sum(w ** 2 for w in user_history.values()))
            norm_b = np.sqrt(sum(w ** 2 for w in other_papers.values()))
            if norm_a > 0 and norm_b > 0:
                user_similarities[other_user] = dot_product / (norm_a * norm_b)

        # 5. Predict collaborative affinity for each candidate paper with save boost
        for pid in candidate_paper_ids:
            users_who_liked = self._paper_interacted_users.get(pid, {})
            if not users_who_liked:
                # Default baseline score with save bonus
                rel_saves = save_counts.get(pid, 0) / max_saves
                score_map[pid] = float(np.clip(0.48 + 0.20 * rel_saves, 0.30, 0.95))
                continue

            # Weighted sum of similarities of users who interacted with this paper
            sim_sum = 0.0
            weight_sum = 0.0
            for u, w in users_who_liked.items():
                u_sim = user_similarities.get(u, 0.15)  # prior default similarity
                sim_sum += u_sim * w
                weight_sum += abs(u_sim)

            predicted = (sim_sum / weight_sum) if weight_sum > 0 else 0.50
            # Blend user affinity with paper popularity and explicit save frequency
            pop_factor = paper_totals.get(pid, 0.0) / max_paper_weight
            save_factor = save_counts.get(pid, 0) / max_saves
            final_collab = 0.50 * (predicted / 4.0) + 0.25 * pop_factor + 0.25 * save_factor
            score_map[pid] = float(np.clip(final_collab, 0.30, 0.99))

        return score_map

    def get_recommendations_for_user(
        self,
        user_id: str,
        all_paper_ids: List[str],
        top_k: int = 10,
    ) -> List[Tuple[str, float]]:
        """
        Generates collaborative filtering recommendations specifically tailored to user's history.
        """
        scores = self.get_collaborative_scores(user_id=user_id, candidate_paper_ids=all_paper_ids)
        # Exclude papers already saved or liked if desired, or keep as top matches
        sorted_papers = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_papers[:top_k]
