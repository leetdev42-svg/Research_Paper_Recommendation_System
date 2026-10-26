from .papers import router as papers_router
from .recommendations import router as recommendations_router
from .interactions import router as interactions_router

__all__ = ["papers_router", "recommendations_router", "interactions_router"]
