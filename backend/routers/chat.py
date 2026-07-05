from fastapi import APIRouter

from models import ChatRequest
from services.chat_service import ChatService

router = APIRouter(prefix="", tags=["Chat"])
chat_service = ChatService()


@router.post("/ai-chat")
async def chat_endpoint(request: ChatRequest):
    response_text = chat_service.chat(request.history, request.message)
    return {"response": response_text}
