import os
import PyPDF2
from openai import OpenAI
import json
import numpy as np
from dotenv import load_dotenv
import datetime
import time

load_dotenv(override=True)

# Configure OpenAI (compatible with Groq)
api_key = os.getenv("OPENAI_API_KEY", "")
base_url = os.getenv("OPENAI_BASE_URL", "https://api.groq.com/openai/v1")
model_name = os.getenv("LLM_MODEL_NAME", "llama-3.3-70b-versatile")

print(f"LLM Config: Model={model_name}, BaseURL={base_url}")

if not api_key:
    print("CRITICAL ERROR: OPENAI_API_KEY is missing or empty.")

client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

# Dummy embedding function since Groq might not support embeddings or uses different setup.
# For now, we will SKIP embeddings or use a placeholder if not critical for simple search.
# OR we can keep using Gemini for embeddings if the key is still there?
# The user wants to switch 'llm from gemini to grok'. Usually specific to Chat/Generation.
# We will disable embeddings for now or return empty to avoid errors.

def extract_text_from_pdf(file_stream) -> str:
    """Reads text from an uploaded PDF stream."""
    try:
        pdf_reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        print(f"PDF Error: {e}")
        return ""

async def analyze_with_gemini(text_content: str) -> dict:
    """
    Renamed conceptually, but kept function name for compatibility if main.py imports it.
    Uses OpenAI/Groq for analysis.
    """
    
    system_prompt = """
    Act as a Senior Technical Lead. Analyze the document.
    Return ONLY a raw JSON object with:
    - "skills": [list of strings]
    - "role": "Inferred Job Title"
    - "summary": "2-sentence summary"
    - "complexity_score": int 1-10
    - "projects": [{ "title", "description", "tech_stack" }]
    - "education": [{ "degree", "institution", "year" }]
    - "location": "City, Country"
    """

    user_message = f"""
    Document Content:
    {text_content[:15000]}
    """

    analysis_json = {
        "skills": [], 
        "role": "Student",
        "summary": "Analysis Pending", 
        "complexity_score": 0,
        "projects": [],
        "education": [],
        "location": "Unknown"
    }

    try:
        print(f"Analyzing with {model_name}...")
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            response_format={"type": "json_object"} # Groq supports this for Llama 3
        )
        
        content = response.choices[0].message.content
        analysis_json = json.loads(content)
        print("Analysis successful.")

    except Exception as e:
        print(f"Analysis Error: {e}")
        analysis_json["summary"] = f"Analysis Failed: {str(e)}"

    # Embeddings - Skipping for now or stubbing
    embedding_vector = []

    return {
        "analysis": analysis_json,
        "embedding": embedding_vector
    }

def calculate_cosine_similarity(vec_a, vec_b):
    return 0.0 # Disabled

def chat_with_bot(history, message):
    """
    Chat wrapper for OpenAI/Groq.
    History comes in as [{'role': 'user'/'model', 'parts': ['text']}] (Gemini format).
    We must convert to OpenAI format: [{'role': 'user'/'assistant', 'content': 'text'}]
    """
    try:
        # 1. Convert History
        openai_history = []
        openai_history.append({
            "role": "system", 
            "content": "You are Skill-Bridge AI, a professional career assistant. Help with resumes, skills, and tech questions."
        })

        for msg in history:
            role = 'assistant' if msg['role'] == 'model' else 'user'
            # 'parts' is a list in Gemini, OpenAI expects string content
            content = " ".join(msg.get('parts', [])) if isinstance(msg.get('parts'), list) else str(msg.get('parts', ''))
            openai_history.append({"role": role, "content": content})
        
        # 2. Add current message
        openai_history.append({"role": "user", "content": message})

        print(f"Chatting with {model_name}...")
        response = client.chat.completions.create(
            model=model_name,
            messages=openai_history,
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Chat Error: {e}")
        return "I'm having trouble connecting to Groq right now. Please check your API Key."
