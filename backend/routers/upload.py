from fastapi import APIRouter, File, Form, UploadFile

from services.upload_service import UploadService

router = APIRouter(tags=["Upload"])
upload_service = UploadService()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form(...),
):
    try:
        return await upload_service.process_resume(file, user_id)
    except Exception as exc:
        if hasattr(exc, "status_code"):
            raise exc
        raise RuntimeError(str(exc)) from exc
