from fastapi import APIRouter

from models import SearchQuery
from services.search_service import SearchService

router = APIRouter(prefix="", tags=["Vector"])
search_service = SearchService()


@router.post("/vectorize")
async def vectorize_query(search: SearchQuery):
    """
    Helper endpoint for client-side search.
    Returns the embedding vector for a text query.
    """
    embedding = search_service.vectorize_query(search.query_text)
    return {"embedding": embedding}
