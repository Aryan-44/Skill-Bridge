import asyncio
from gemini_utils import analyze_with_gemini

async def test():
    print("Testing Gemini API...")
    text = "This is a test resume for a Python developer with experience in FastAPI and React."
    result = await analyze_with_gemini(text)
    print("Result:", result)

if __name__ == "__main__":
    asyncio.run(test())
