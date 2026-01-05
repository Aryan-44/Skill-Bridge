from pydantic import BaseModel
from typing import List, Optional

class UserProfile(BaseModel):
    user_id: str
    name: str
    email: str
    skills: List[str]
    role: Optional[str] = "Student" # Analyzed Role (e.g. "Full Stack Developer")
    summary: str
    complexity_score: int
    location: Optional[str] = "Unknown"
    phone: Optional[str] = ""
    social_links: Optional[dict] = {} # e.g. {"linkedin": "...", "github": "..."}
    embedding: List[float]  # The "Implicit Knowledge" Vector

class SearchQuery(BaseModel):
    query_text: str
    limit: Optional[int] = 5

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = [] # List of {role: "user"|"model", parts: ["msg"]}

class EmailNotificationRequest(BaseModel):
    to_email: str
    subject: str
    body: str
