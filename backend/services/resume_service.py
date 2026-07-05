from typing import Any

from fastapi import HTTPException, UploadFile

import llm_utils


class ResumeService:
    async def analyze_uploaded_file(self, file: UploadFile) -> dict[str, Any]:
        if not file.filename:
            raise HTTPException(status_code=400, detail="A filename is required")

        if file.filename.lower().endswith(".pdf"):
            text = llm_utils.extract_text_from_pdf(file.file)
        else:
            try:
                text = (await file.read()).decode("utf-8")
            except UnicodeDecodeError:
                text = (await file.read()).decode("latin-1", errors="ignore")

        if not text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text. File might be empty or image-based.",
            )

        result = await llm_utils.analyze_document(text)

        return {
            "status": "success",
            "data": result["analysis"],
            "embedding": result["embedding"],
        }
