from pydantic import BaseModel
from typing import List, Optional

class UserProfile(BaseModel):
    user_id: str
    name: str
    skills: List[str]
    bio: str
    embedding: List[float]

class SearchRequest(BaseModel):
    query: str
    limit: int = 3
