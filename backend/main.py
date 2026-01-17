import uvicorn
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import UserProfile, SearchQuery, EmailNotificationRequest, ChatRequest

import llm_utils

app = FastAPI(title="Skill-Bridge Backend")

# CORS Setup: allow local dev ports and optionally override via ALLOW_ORIGINS env var
allow_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://dev-skill-bridge.netlify.app",
    "https://skill-bridge-coral.vercel.app",
]

extra_origins = os.getenv("ALLOW_ORIGINS")
if extra_origins:
    allow_origins.extend(
        [o.strip() for o in extra_origins.split(",") if o.strip()]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes ---

@app.get("/")
def health_check():
    return {"status": "System Operational", "service": "Skill-Bridge API (Stateless)"}

@app.post("/send-email")
def send_email_notification(email_req: EmailNotificationRequest):
    """
    Mock Email Sender. 
    In production, this would use SMTP or an Email API (SendGrid, AWS SES).
    """
    print(f"\n[MOCK EMAIL SERVICE]")
    print(f"To: {email_req.to_email}")
    print(f"Subject: {email_req.subject}")
    print(f"Body: {email_req.body}")
    print(f"[END EMAIL]\n")
    
    return {"status": "sent", "message": "Email logged to console"}

@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    """
    1. Receives PDF/Code file.
    2. Extracts Text.
    3. Calls LLM (OpenAI/Groq) for Analysis.
    """
    # 1. Read File
    print(f"[ANALYZE] Received file: {file.filename}")
    if file.filename.endswith(".pdf"):
        text = llm_utils.extract_text_from_pdf(file.file)
    else:
        # Assume text-based file (py, js, txt, md)
        text = (await file.read()).decode("utf-8")
    
    if not text:
        raise HTTPException(status_code=400, detail="Could not extract text. File might be empty or image-based.")

    # 2. Analyze
    result = await llm_utils.analyze_document(text) # Updated function name
    
    return {
        "status": "success",
        "data": result['analysis'],       # For Displaying in UI
        "embedding": result['embedding']  # To be sent back in /save-profile
    }

@app.post("/ai-chat")
async def chat_endpoint(request: ChatRequest):
    response_text = llm_utils.chat_with_bot(request.history, request.message)
    return {"response": response_text}

@app.post("/vectorize")
async def vectorize_query(search: SearchQuery):
    """
    Helper endpoint for Client-Side Search.
    Returns the embedding vector for a text query.
    Now uses Hugging Face API (Free & Lightweight).
    """
    embedding = llm_utils.get_hf_embedding(search.query_text)
    return {"embedding": embedding}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
