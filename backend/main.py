import os

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import chat, community, email, resume, search, vector

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
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(community.router)
app.include_router(resume.router)
app.include_router(email.router)
app.include_router(chat.router)
app.include_router(search.router)
app.include_router(vector.router)


@app.get("/")
def health_check():
    return {"status": "System Operational", "service": "Skill-Bridge API (Stateless)"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
