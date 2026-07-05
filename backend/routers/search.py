from fastapi import APIRouter

from models import SearchRequest
from services.search_service import SearchService

router = APIRouter(tags=["Search"])
search_service = SearchService()


@router.post("/search")
async def search_partners(request: SearchRequest):
    return await search_service.search_partners(request)
