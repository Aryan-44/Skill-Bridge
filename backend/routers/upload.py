from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.gemini_service import analyze_document
from firebase_config import db
from models.schemas import UserProfile

router = APIRouter()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    user_id: str = Form(...)
):
    try:
        content = await file.read()
        filename = file.filename
        
        # Analyze Document
        result = analyze_document(content, filename)
        
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
        
        analysis = result["analysis"]
        embedding = result["embedding"]
        
        # Create User Profile Data
        # Note: Name is not extracted, so we might need to update it separately 
        # or extract it if the prompt allowed. For now, we'll placeholder it or use filename
        # Phase 3 requirement says "save the result... to Firestore collection named users"
        
        user_data = {
            "user_id": user_id,
            "skills": analysis.get("skills", []),
            "bio": analysis.get("summary", ""),
            "embedding": embedding,
            "complexity_score": analysis.get("complexity_score", 0),
            # Ideally name should come from user input, but for this specific endpoint flow:
            "name": f"User {user_id[:5]}" # Placeholder if not provided
        }
        
        # Save to Firestore
        db.collection("users").document(user_id).set(user_data, merge=True)
        
        return {"status": "success", "data": user_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
