import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv(override=True)
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("NO_API_KEY")
    exit()

genai.configure(api_key=api_key)

print("--- AVAILABLE MODELS ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
    print("--- END LIST ---")
except Exception as e:
    print(f"ERROR: {e}")
