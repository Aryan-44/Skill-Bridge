from fastapi import HTTPException

import llm_utils
from firebase_config import db
from models import SearchQuery, SearchRequest
from services.gemini_service import get_embedding
from utils.vector_utils import cosine_similarity


class SearchService:
    async def search_partners(self, request: SearchRequest) -> list[dict]:
        query_embedding = get_embedding(request.query)
        if not query_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate query embedding")

        users_ref = db.collection("users")
        docs = users_ref.stream()

        results = []
        for doc in docs:
            user_data = doc.to_dict()
            if "embedding" not in user_data:
                continue

            similarity = cosine_similarity(query_embedding, user_data["embedding"])
            results.append(
                {
                    "user_id": user_data.get("user_id"),
                    "name": user_data.get("name"),
                    "skills": user_data.get("skills"),
                    "bio": user_data.get("bio"),
                    "match_score": similarity,
                }
            )

        results.sort(key=lambda item: item["match_score"], reverse=True)
        return results[: request.limit]

    def vectorize_query(self, query_text: str) -> list[float]:
        return llm_utils.get_hf_embedding(query_text)
