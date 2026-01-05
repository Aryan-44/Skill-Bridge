import google.generativeai as genai
import os
import io
import json
from pypdf import PdfReader

API_KEY = os.environ.get("GOOGLE_API_KEY")

if not API_KEY:
    print("Warning: GOOGLE_API_KEY environment variable not set.")

def configure_gemini():
    if API_KEY:
        genai.configure(api_key=API_KEY)
        print("Gemini configured successfully.")
    else:
        print("Gemini configuration skipped due to missing API Key.")

configure_gemini()

def extract_text(file_content: bytes, filename: str) -> str:
    """Extracts text from PDF or returns raw text for other files."""
    if filename.lower().endswith('.pdf'):
        try:
            reader = PdfReader(io.BytesIO(file_content))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""
    else:
        # Assume code or text file
        try:
            return file_content.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback for non-utf8
            return file_content.decode('latin-1', errors='ignore')

def get_embedding(text: str) -> list[float]:
    """Generates embedding using Gemini's embedding-001 model."""
    if not API_KEY:
        return []
    try:
        # Embedding model usually accepts 'content' as a dict or string depending on version, 
        # but the simple method is often genai.embed_content
        result = genai.embed_content(
            model="models/embedding-001",
            content=text,
            task_type="retrieval_document",
            title="Skill Profile"
        )
        return result['embedding']
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def analyze_document(file_content: bytes, filename: str) -> dict:
    """
    Analyzes the document/code to extract skills and generates an embedding.
    """
    text = extract_text(file_content, filename)
    if not text:
        return {"error": "Could not extract text from document"}

    # System Prompt Validation
    system_prompt = (
        "Analyze the following academic document/code. Do not just list keywords. "
        "Identify the specific technical concepts applied, the depth of understanding "
        "(Basic/Intermediate/Advanced), and the specific tools/libraries used. "
        "Return a JSON summary with keys: \"skills\" (list of strings), "
        "\"summary\" (short text), and \"complexity_score\" (1-10). "
        "Output ONLY the raw JSON string, no markdown formatting."
    )

    model = genai.GenerativeModel('gemini-1.5-pro')
    
    try:
        response = model.generate_content([system_prompt, text])
        # Clean up code blocks if present
        response_text = response.text.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(response_text)
        
        # Generate embedding for the summary
        embedding = get_embedding(analysis.get("summary", ""))
        
        return {
            "analysis": analysis,
            "embedding": embedding
        }

    except Exception as e:
        print(f"Error in Gemini analysis: {e}")
        return {"error": str(e)}
