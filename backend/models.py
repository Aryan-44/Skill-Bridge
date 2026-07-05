from pydantic import BaseModel, Field
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

class SearchRequest(BaseModel):
    query: str
    limit: int = 3

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = [] # List of {role: "user"|"model", parts: ["msg"]}

class EmailNotificationRequest(BaseModel):
    to_email: str
    subject: str
    body: str

class HackathonExperience(BaseModel):
    id: Optional[str] = None
    user_id: str
    user_name: str
    hackathon_name: str
    journey: str
    challenges: str
    how_overcome: str
    tips: Optional[str] = None
    video_url: Optional[str] = None
    upvotes: List[str] = Field(default_factory=list) # List of user_ids who upvoted
    timestamp: Optional[str] = None

class CollegeEvent(BaseModel):
    id: Optional[str] = None
    user_id: str
    user_name: str
    title: str
    college_name: Optional[str] = None
    event_type: Optional[str] = "Hackathon"
    description: str
    poster_url: Optional[str] = None
    video_url: Optional[str] = None
    date: str
    location: str
    registration_link: Optional[str] = None
    contact_note: Optional[str] = None
    interested_users: List[str] = Field(default_factory=list) # List of user IDs
    timestamp: Optional[str] = None

