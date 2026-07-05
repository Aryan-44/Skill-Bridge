from fastapi import HTTPException, UploadFile

from firebase_config import db
from services.gemini_service import analyze_document


class UploadService:
    ALLOWED_EXTENSIONS = {".pdf", ".docx"}
    MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

    def _validate_file(self, file: UploadFile) -> None:
        if not file.filename:
            raise HTTPException(status_code=400, detail="A filename is required")

        extension = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
        if extension not in {"pdf", "docx"}:
            raise HTTPException(status_code=415, detail="Unsupported file type")

    async def process_resume(self, file: UploadFile, user_id: str) -> dict:
        self._validate_file(file)

        content = await file.read()
        if len(content) > self.MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large")

        filename = file.filename or ""
        result = analyze_document(content, filename)

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        analysis = result["analysis"]
        embedding = result["embedding"]

        user_data = {
            "user_id": user_id,
            "skills": analysis.get("skills", []),
            "bio": analysis.get("summary", ""),
            "embedding": embedding,
            "complexity_score": analysis.get("complexity_score", 0),
            "name": f"User {user_id[:5]}",
        }

        db.collection("users").document(user_id).set(user_data, merge=True)
        return {"status": "success", "data": user_data}
