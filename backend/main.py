import os
from contextlib import asynccontextmanager
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment configuration if present
load_dotenv()

from services.paper_service import PaperService
from services.content_based import ContentBasedRecommender
from services.collaborative import CollaborativeFilteringService
from services.hybrid import HybridRecommender

from api.papers import router as papers_router
from api.recommendations import router as recommendations_router
from api.interactions import router as interactions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context:
    Initializes paper indexing, TF-IDF matrix vectorization, and collaborative state
    once on startup so all subsequent requests execute with sub-millisecond latency.
    """
    print("=" * 60)
    print("Initializing Scholaris Research Paper Recommendation Backend...")

    # 1. Load paper dataset
    csv_path = os.getenv("PAPERS_CSV_PATH", "data/papers.csv")
    paper_service = PaperService(csv_path=csv_path)
    df = paper_service.get_dataframe()
    print(f"Loaded {len(df)} papers from {paper_service.csv_path}")

    # 2. Build TF-IDF vectorizer and compute persistent matrix
    print("Indexing text representations & building TF-IDF vocabulary...")
    content_recommender = ContentBasedRecommender(papers_df=df)
    print(f"Content-Based engine ready with {len(content_recommender.paper_ids)} indexed papers.")

    # 3. Initialize collaborative filtering interaction engine
    collaborative_service = CollaborativeFilteringService()
    print("Collaborative Filtering service initialized with interaction repository.")

    # 4. Initialize hybrid recommender
    hybrid_recommender = HybridRecommender(
        paper_service=paper_service,
        content_recommender=content_recommender,
        collaborative_service=collaborative_service,
    )
    print(
        f"Hybrid engine online (Default weights: Content={hybrid_recommender.default_content_weight}, "
        f"Collaborative={hybrid_recommender.default_collaborative_weight})"
    )
    print("=" * 60)

    # Attach instances to app state for dependency sharing
    app.state.paper_service = paper_service
    app.state.content_recommender = content_recommender
    app.state.collaborative_service = collaborative_service
    app.state.hybrid_recommender = hybrid_recommender

    yield

    print("Shutting down recommendation backend...")


app = FastAPI(
    title="Scholaris Research Paper Recommendation API",
    description="High-performance hybrid research paper discovery engine powered by TF-IDF Content-Based Filtering, Collaborative Reader Affinity, and SciPy Spearman Rank Correlation.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
frontend_env = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000,http://localhost:5173")
origins: List[str] = [orig.strip() for orig in frontend_env.split(",") if orig.strip()]

# Add default development origins
for dev_origin in ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]:
    if dev_origin not in origins:
        origins.append(dev_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler for unexpected errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal recommendation service error occurred. Please verify your request parameters."},
    )


# Root & Health check endpoints
@app.get("/", tags=["System"])
def root():
    return {
        "service": "Scholaris Research Paper Recommendation API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "papers": "/api/papers",
            "recommendations": "/api/recommendations",
            "interactions": "/api/interactions",
            "saved_papers": "/api/users/{user_id}/saved",
            "user_recommendations": "/api/users/{user_id}/recommendations",
            "documentation": "/docs",
        },
    }


@app.get("/api/health", tags=["System"])
def health_check(request: Request):
    paper_service = getattr(request.app.state, "paper_service", None)
    total_papers = len(paper_service.get_dataframe()) if paper_service else 0
    return {
        "status": "healthy",
        "indexed_papers": total_papers,
        "hybrid_engine": "online",
    }


# Include Routers
app.include_router(papers_router)
app.include_router(recommendations_router)
app.include_router(interactions_router)


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host=host, port=port, reload=True)
