from fastapi import APIRouter, HTTPException, Request
from models.schemas import (
    InteractionRequest,
    InteractionResponse,
    SavedPapersResponse,
)

router = APIRouter(tags=["Interactions"])

VALID_INTERACTIONS = {"view", "save", "like"}


@router.post("/api/interactions", response_model=InteractionResponse)
def record_interaction(request: Request, body: InteractionRequest):
    """
    Records an interaction (view, save, like) between a user and a paper.
    Updates collaborative filtering interaction graphs and user affinity history.
    """
    clean_action = body.interaction.lower().strip()
    if clean_action not in VALID_INTERACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid interaction type '{body.interaction}'. Must be one of: {list(VALID_INTERACTIONS)}",
        )

    paper_service = request.app.state.paper_service
    if not paper_service.paper_exists(body.paper_id):
        raise HTTPException(
            status_code=404,
            detail=f"Paper with ID '{body.paper_id}' does not exist.",
        )

    collaborative_service = request.app.state.collaborative_service
    record = collaborative_service.record_interaction(
        user_id=body.user_id,
        paper_id=body.paper_id,
        interaction=clean_action,
    )

    action_verbs = {
        "view": "viewed",
        "save": "saved to library",
        "like": "liked",
    }
    verb = action_verbs.get(clean_action, "recorded")

    return InteractionResponse(
        status="success",
        message=f"Paper '{body.paper_id}' successfully {verb} for user '{body.user_id}'.",
        user_id=record["user_id"],
        paper_id=record["paper_id"],
        interaction=record["interaction"],
        timestamp=record["timestamp"],
    )


@router.get("/api/users/{user_id}/saved", response_model=SavedPapersResponse)
def get_user_saved_papers(request: Request, user_id: str):
    """
    Retrieves all research papers saved to the library by the specified user.
    """
    paper_service = request.app.state.paper_service
    collaborative_service = request.app.state.collaborative_service

    saved_ids = collaborative_service.get_user_saved_paper_ids(user_id=user_id)
    saved_papers = [
        paper_service.get_paper_by_id(pid)
        for pid in saved_ids
        if paper_service.get_paper_by_id(pid)
    ]

    return SavedPapersResponse(
        user_id=user_id,
        total=len(saved_papers),
        papers=saved_papers,
    )
