from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Paper(BaseModel):
    id: str = Field(..., description="Unique paper identifier")
    title: str = Field(..., description="Title of the research paper")
    authors: List[str] = Field(default_factory=list, description="List of paper authors")
    abstract: str = Field(..., description="Summary or abstract of the research")
    year: int = Field(..., description="Publication year")
    keywords: List[str] = Field(default_factory=list, description="Associated research keywords/topics")
    category: str = Field(..., description="Primary research field or category")
    url: str = Field(..., description="DOI or source publication URL")


class PaperListResponse(BaseModel):
    total: int = Field(..., description="Total matching papers")
    papers: List[Paper] = Field(..., description="List of papers")


class RecommendationRequest(BaseModel):
    user_id: Optional[str] = Field("user123", description="User identifier for personalized collaborative filtering")
    query: str = Field(..., min_length=1, description="Research topic, question, or keyword query")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Maximum number of recommendations to return")
    content_weight: Optional[float] = Field(None, ge=0.0, le=1.0, description="Override weight for content-based score")
    collaborative_weight: Optional[float] = Field(None, ge=0.0, le=1.0, description="Override weight for collaborative score")


class RecommendationItem(BaseModel):
    paper: Paper = Field(..., description="Recommended research paper")
    content_score: float = Field(..., description="Content-based similarity score (TF-IDF cosine similarity)")
    collaborative_score: float = Field(..., description="Collaborative filtering affinity score")
    final_score: float = Field(..., description="Weighted hybrid recommendation score")
    why_this_paper: Optional[str] = Field(None, description="Human-interpretable recommendation rationale")


class RankingEvaluation(BaseModel):
    spearman_correlation: Optional[float] = Field(None, description="Spearman rank correlation coefficient between rankings")
    p_value: Optional[float] = Field(None, description="P-value associated with Spearman correlation test")
    interpretation: Optional[str] = Field(None, description="Qualitative summary of the correlation between approaches")


class RecommendationResponse(BaseModel):
    query: str = Field(..., description="Original search/recommendation query")
    user_id: Optional[str] = Field(None, description="Target user identifier")
    recommendations: List[RecommendationItem] = Field(..., description="Ranked list of recommended papers")
    evaluation: Optional[RankingEvaluation] = Field(None, description="Spearman rank correlation comparison of the individual rankers")


class InteractionType(str):
    VIEW = "view"
    SAVE = "save"
    LIKE = "like"


class InteractionRequest(BaseModel):
    user_id: str = Field(..., min_length=1, description="ID of the user interacting with the paper")
    paper_id: str = Field(..., min_length=1, description="Target paper ID")
    interaction: str = Field(..., description="Interaction action: 'view', 'save', or 'like'")


class InteractionResponse(BaseModel):
    status: str = Field("success", description="Status of interaction recording")
    message: str = Field(..., description="Confirmation message")
    user_id: str = Field(..., description="User ID")
    paper_id: str = Field(..., description="Paper ID")
    interaction: str = Field(..., description="Interaction type")
    timestamp: str = Field(..., description="ISO 8601 interaction timestamp")


class SavedPapersResponse(BaseModel):
    user_id: str = Field(..., description="User ID")
    total: int = Field(..., description="Count of saved papers")
    papers: List[Paper] = Field(..., description="List of papers bookmarked/saved by user")


class UserRecommendationsResponse(BaseModel):
    user_id: str = Field(..., description="User ID")
    total: int = Field(..., description="Count of personalized recommendations")
    recommendations: List[RecommendationItem] = Field(..., description="Personalized paper recommendations")


class ErrorResponse(BaseModel):
    detail: str = Field(..., description="Error message explanation")
