import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app
from services.paper_service import PaperService
from services.content_based import ContentBasedRecommender
from services.collaborative import CollaborativeFilteringService
from services.hybrid import HybridRecommender
from services.ranking import RankingEvaluator


def test_services():
    print(">>> Testing PaperService...")
    ps = PaperService(csv_path=str(backend_dir / "data" / "papers.csv"))
    df = ps.get_dataframe()
    assert len(df) >= 20, f"Expected at least 20 papers, got {len(df)}"
    paper = ps.get_paper_by_id("paper001")
    assert paper is not None
    assert "Elena R. Vance" in paper.authors
    print(f"PaperService OK: {len(df)} papers indexed.")

    print(">>> Testing ContentBasedRecommender...")
    cbr = ContentBasedRecommender(papers_df=df)
    results = cbr.recommend(query="machine learning for medical diagnosis", top_k=5)
    assert len(results) == 5
    top_id, top_score = results[0]
    print(f"Content-Based Top Match: {top_id} with score {top_score:.4f}")
    assert top_score > 0.0

    print(">>> Testing CollaborativeFilteringService...")
    cf = CollaborativeFilteringService()
    cf.record_interaction(user_id="test_user", paper_id="paper001", interaction="view")
    cf.record_interaction(user_id="test_user", paper_id="paper002", interaction="save")
    cf.record_interaction(user_id="test_user", paper_id="paper003", interaction="like")
    saved = cf.get_user_saved_paper_ids("test_user")
    assert "paper002" in saved
    scores = cf.get_collaborative_scores("test_user", ["paper001", "paper002", "paper003", "paper004"])
    assert len(scores) == 4
    print("CollaborativeFilteringService OK.")

    print(">>> Testing HybridRecommender...")
    hybrid = HybridRecommender(
        paper_service=ps,
        content_recommender=cbr,
        collaborative_service=cf,
        default_content_weight=0.7,
        default_collaborative_weight=0.3,
    )
    recs, eval_res = hybrid.recommend(
        query="machine learning for medical diagnosis",
        user_id="test_user",
        limit=5,
    )
    assert len(recs) == 5
    print("Top Hybrid Recommendation:")
    for r in recs[:3]:
        print(f"  - {r.paper.title[:50]}... | Final: {r.final_score} (Content: {r.content_score}, Collab: {r.collaborative_score})")
        print(f"    Why: {r.why_this_paper}")
    print(f"Spearman Rank Correlation: {eval_res.spearman_correlation} (p={eval_res.p_value})")

    print(">>> Testing SciPy Spearman Rank Correlation...")
    corr, p_val = RankingEvaluator.calculate_spearman([0.9, 0.8, 0.7, 0.6], [0.85, 0.75, 0.65, 0.55])
    assert corr is not None and corr > 0.99
    print(f"SciPy Spearman Correlation OK: {corr} (p={p_val})")


def test_api():
    print(">>> Testing FastAPI Endpoints via TestClient...")
    with TestClient(app) as client:
        # 1. Health
        res = client.get("/api/health")
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["status"] == "healthy"
        print("GET /api/health OK")

        # 2. Papers list
        res = client.get("/api/papers?limit=5")
        assert res.status_code == 200, res.text
        assert len(res.json()["papers"]) == 5
        print("GET /api/papers OK")

        # 3. Single paper
        res = client.get("/api/papers/paper001")
        assert res.status_code == 200, res.text
        assert res.json()["id"] == "paper001"
        print("GET /api/papers/paper001 OK")

        # 4. Similar papers
        res = client.get("/api/papers/paper001/similar?limit=3")
        assert res.status_code == 200, res.text
        assert len(res.json()["similar_papers"]) == 3
        print("GET /api/papers/paper001/similar OK")

        # 5. Hybrid Recommendations
        rec_payload = {
            "user_id": "user123",
            "query": "machine learning for medical diagnosis",
            "limit": 5,
            "content_weight": 0.7,
            "collaborative_weight": 0.3
        }
        res = client.post("/api/recommendations", json=rec_payload)
        assert res.status_code == 200, res.text
        rec_data = res.json()
        assert len(rec_data["recommendations"]) == 5
        assert "evaluation" in rec_data
        print(f"POST /api/recommendations OK ({len(rec_data['recommendations'])} items)")

        # 6. Record interaction
        inter_payload = {
            "user_id": "user_tester",
            "paper_id": "paper001",
            "interaction": "save"
        }
        res = client.post("/api/interactions", json=inter_payload)
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "success"
        print("POST /api/interactions OK")

        # 7. Get saved papers
        res = client.get("/api/users/user_tester/saved")
        assert res.status_code == 200, res.text
        saved_papers = res.json()["papers"]
        assert any(p["id"] == "paper001" for p in saved_papers)
        print("GET /api/users/user_tester/saved OK")

        # 8. User personalized recommendations
        res = client.get("/api/users/user_tester/recommendations?limit=5")
        assert res.status_code == 200, res.text
        user_recs = res.json()["recommendations"]
        assert len(user_recs) == 5
        print("GET /api/users/user_tester/recommendations OK")

        # 9. Trending papers
        res = client.get("/api/papers/trending?limit=3")
        assert res.status_code == 200, res.text
        trending_data = res.json()["papers"]
        assert len(trending_data) == 3
        print("GET /api/papers/trending OK")


if __name__ == "__main__":
    test_services()
    test_api()
    print("\n[SUCCESS] ALL TESTS PASSED SUCCESSFULLY!")

