import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

def log(msg):
    print(msg)
    with open("error.log", "a") as f:
        f.write(msg + "\n")

log("--- Starting Debug ---")
try:
    log(f"Key loaded: {api_key[:5]}...")
except:
    log("Key NOT loaded")

# Test 1: Generation
try:
    log("Testing Generation (gemini-2.5-flash)...")
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content("Hello")
    log(f"Generation Success: {response.text}")
except Exception as e:
    log(f"Generation FAILED: {e}")

# Test 2: Embedding
try:
    log("Testing Embedding (models/embedding-001)...")
    result = genai.embed_content(
        model='models/embedding-001',
        content="Hello world",
        task_type="retrieval_document"
    )
    log("Embedding Success")
except Exception as e:
    log(f"Embedding FAILED: {e}")
