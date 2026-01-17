import os
import asyncio
from dotenv import load_dotenv
import llm_utils

# Load environment variables
load_dotenv(override=True)

async def test_apis():
    print("--- Testing API Keys & Local Models ---")
    
    # 1. Test Groq (Chat)
    print(f"\n1. Testing Groq (Chat)...")
    try:
        response = llm_utils.chat_with_bot([], "Hello, are you working?")
        print(f"✅ Groq Success")
    except Exception as e:
        print(f"❌ Groq Failed: {e}")

    # 2. Test Local Embeddings
    print(f"\n2. Testing Local Embeddings (SentenceTransformer)...")
    try:
        # Note: llm_utils.get_local_embedding is synchronous
        embedding = llm_utils.get_local_embedding("Test text for embedding")
        if embedding and len(embedding) == 384:
            print(f"✅ Local Embedding Success: Vector length {len(embedding)}")
        else:
            print(f"❌ Local Embedding Failed: Length {len(embedding) if embedding else 0} (Expected 384)")
    except Exception as e:
        print(f"❌ Local Embedding Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_apis())
