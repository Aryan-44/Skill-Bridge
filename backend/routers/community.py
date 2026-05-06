from fastapi import APIRouter, HTTPException
from typing import List
from models import HackathonExperience, CollegeEvent
from firebase_config import db
import datetime

router = APIRouter(prefix="/community", tags=["Community"])

@router.post("/experiences")
async def create_experience(experience: HackathonExperience):
    try:
        exp_data = experience.dict()
        exp_data["timestamp"] = datetime.datetime.now().isoformat()
        
        # Add to Firestore
        doc_ref = db.collection("hackathon_experiences").add(exp_data)
        exp_data["id"] = doc_ref[1].id
        
        return {"status": "success", "data": exp_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/experiences", response_model=List[HackathonExperience])
async def list_experiences():
    try:
        docs = db.collection("hackathon_experiences").order_by("timestamp", direction="DESCENDING").stream()
        experiences = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            experiences.append(data)
        return experiences
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/experiences/{experience_id}/upvote")
async def upvote_experience(experience_id: str, user_id: str):
    try:
        doc_ref = db.collection("hackathon_experiences").document(experience_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Experience not found")
        
        data = doc.to_dict()
        upvotes = data.get("upvotes", [])
        
        if user_id in upvotes:
            upvotes.remove(user_id) # Toggle upvote
            status = "removed"
        else:
            upvotes.append(user_id)
            status = "added"
            
        doc_ref.update({"upvotes": upvotes})
        return {"status": "success", "upvote_status": status, "count": len(upvotes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events")
async def create_event(event: CollegeEvent):
    try:
        event_data = event.dict()
        event_data["timestamp"] = datetime.datetime.now().isoformat()
        
        # Add to Firestore
        doc_ref = db.collection("college_events").add(event_data)
        event_data["id"] = doc_ref[1].id
        
        return {"status": "success", "data": event_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events", response_model=List[CollegeEvent])
async def list_events():
    try:
        docs = db.collection("college_events").order_by("timestamp", direction="DESCENDING").stream()
        events = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            events.append(data)
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events/{event_id}/interest")
async def toggle_event_interest(event_id: str, user_id: str):
    try:
        doc_ref = db.collection("college_events").document(event_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Event not found")
        
        data = doc.to_dict()
        interested = data.get("interested_users", [])
        
        if user_id in interested:
            interested.remove(user_id)
            status = "removed"
        else:
            interested.append(user_id)
            status = "added"
            
        doc_ref.update({"interested_users": interested})
        return {"status": "success", "interest_status": status, "count": len(interested)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

