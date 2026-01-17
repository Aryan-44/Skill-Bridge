import os
import PyPDF2
from openai import OpenAI
import requests
import json
from dotenv import load_dotenv

load_dotenv(override=True)

# 1. Configure LLM (Groq)
api_key = os.getenv("OPENAI_API_KEY", "")
base_url = os.getenv("OPENAI_BASE_URL", "https://api.groq.com/openai/v1")
model_name = os.getenv("LLM_MODEL_NAME", "llama-3.3-70b-versatile")
hf_api_key = os.getenv("HF_API_KEY", "")

# 2. Configure HF API
HF_API_URL = "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
hf_headers = {"Authorization": f"Bearer {hf_api_key}"}

print(f"LLM Config: Model={model_name}, BaseURL={base_url}")

if not api_key:
    print("CRITICAL ERROR: OPENAI_API_KEY is missing or empty.")

client = OpenAI(
    api_key=api_key,
    base_url=base_url
)

def get_hf_embedding(text: str):
    """Generates embedding using Hugging Face Inference API (Free & Lightweight)."""
    if not text or not hf_api_key:
        print("Embedding Error: Missing text or HF_API_KEY")
        return []
    
    try:
        payload = {"inputs": text}
        response = requests.post(HF_API_URL, headers=hf_headers, json=payload)
        
        if response.status_code == 200:
            # HF API returns a list of embeddings (we sent 1 input)
            return response.json() 
        else:
            print(f"HF API Error {response.status_code}: {response.text}")
            return []
            
    except Exception as e:
        print(f"Embedding Network Error: {e}")
        return []

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

async def analyze_document(text_content: str) -> dict:
    """
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
            response_format={"type": "json_object"} 
        )
        
        content = response.choices[0].message.content
        analysis_json = json.loads(content)
        print("Analysis successful.")

    except Exception as e:
        print(f"Analysis Error: {e}")
        analysis_json["summary"] = f"Analysis Failed: {str(e)}"

    # Generate Embedding using HF API
    # Note: Using json.dumps to ensure it's a string, covering edge cases
    embedding_vector = get_hf_embedding(json.dumps(analysis_json))

    return {
        "analysis": analysis_json,
        "embedding": embedding_vector
    }

def chat_with_bot(history, message):
    """
    Chat wrapper for OpenAI/Groq.
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
