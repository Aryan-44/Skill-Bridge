from fastapi import APIRouter, File, UploadFile

from services.resume_service import ResumeService

router = APIRouter(prefix="", tags=["Resume"])
resume_service = ResumeService()


@router.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    return await resume_service.analyze_uploaded_file(file)
