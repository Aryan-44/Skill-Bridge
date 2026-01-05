from fastapi import APIRouter, HTTPException
from models.schemas import SearchRequest
from services.gemini_service import get_embedding
from utils.vector_utils import cosine_similarity
from firebase_config import db

router = APIRouter()

@router.post("/search")
async def search_partners(request: SearchRequest):
    try:
        query_embedding = get_embedding(request.query)
        if not query_embedding:
             raise HTTPException(status_code=500, detail="Failed to generate query embedding")
        
        # Fetch all users (Naive approach for prototype, use Vector DB for prod)
        users_ref = db.collection("users")
        docs = users_ref.stream()
        
        results = []
        current_user_id = "CURRENT_USER_ID_PLACEHOLDER" # Ideally filtered out, but MVP requires ID in context
        
        for doc in docs:
            user_data = doc.to_dict()
            # Skip if no embedding
            if "embedding" not in user_data:
                continue
                
            similarity = cosine_similarity(query_embedding, user_data["embedding"])
            
            results.append({
                "user_id": user_data.get("user_id"),
                "name": user_data.get("name"),
                "skills": user_data.get("skills"),
                "bio": user_data.get("bio"),
                "match_score": similarity
            })
            
        # Sort by similarity desc
        results.sort(key=lambda x: x["match_score"], reverse=True)
        
        # Return top N
        return results[:request.limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
