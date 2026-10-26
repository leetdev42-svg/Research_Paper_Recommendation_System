from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request
from models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    UserRecommendationsResponse,
    RecommendationItem,
)

router = APIRouter(tags=["Recommendations"])


@router.post("/api/recommendations", response_model=RecommendationResponse)
def get_recommendations(request: Request, body: RecommendationRequest):
    """
    Computes hybrid research paper recommendations combining Content-Based and Collaborative Filtering:
    1. Evaluates semantic relevance of user query via TF-IDF cosine similarity.
    2. Gathers collaborative filtering affinity based on user history and peer interaction patterns.
    3. Blends scores into a final ranking score with configurable weights.
    4. Evaluates ranking concordance using Spearman Rank Correlation (via SciPy).
    """
    clean_query = body.query.strip()
    if not clean_query:
        raise HTTPException(status_code=400, detail="Search query must not be empty.")

    hybrid_recommender = request.app.state.hybrid_recommender

    try:
        recommendations, eval_result = hybrid_recommender.recommend(
            query=clean_query,
            user_id=body.user_id,
            limit=body.limit or 10,
            content_weight=body.content_weight,
            collaborative_weight=body.collaborative_weight,
        )

        return RecommendationResponse(
            query=clean_query,
            user_id=body.user_id,
            recommendations=recommendations,
            evaluation=eval_result,
        )
    except Exception as e:
        # Prevent exposing raw traces to client
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while generating recommendations: {str(e)}",
        )


@router.get("/api/users/{user_id}/recommendations", response_model=UserRecommendationsResponse)
def get_user_personalized_recommendations(
    request: Request,
    user_id: str,
    limit: int = Query(10, ge=1, le=50, description="Number of recommendations"),
):
    """
    Generates personalized recommendations based on the user's saved, liked, and viewed history.
    If the user has minimal interaction history, falls back to highest-relevance content seeds.
    """
    paper_service = request.app.state.paper_service
    collaborative_service = request.app.state.collaborative_service
    hybrid_recommender = request.app.state.hybrid_recommender

    user_interactions = collaborative_service.get_user_interactions(user_id)
    saved_ids = collaborative_service.get_user_saved_paper_ids(user_id)

    # Determine seed topic/query from user's saved and interacted papers
    interacted_paper_ids = [r["paper_id"] for r in user_interactions]
    all_known_ids = saved_ids + [pid for pid in interacted_paper_ids if pid not in saved_ids]

    if all_known_ids:
        # Extract categories and keywords from user's papers to formulate a synthesized query
        sample_papers = [
            paper_service.get_paper_by_id(pid)
            for pid in all_known_ids[:5]
            if paper_service.get_paper_by_id(pid)
        ]
        categories = [p.category for p in sample_papers if p]
        keywords = [kw for p in sample_papers if p for kw in p.keywords[:3]]
        synth_query = " ".join(set(categories + keywords)) or "machine learning"
    else:
        # Fallback query for brand new users
        synth_query = "artificial intelligence machine learning deep learning"

    recommendations, _ = hybrid_recommender.recommend(
        query=synth_query,
        user_id=user_id,
        limit=limit,
    )

    return UserRecommendationsResponse(
        user_id=user_id,
        total=len(recommendations),
        recommendations=recommendations,
    )
