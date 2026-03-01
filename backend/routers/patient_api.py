"""
Patient-facing API — bookings, prescriptions, diagnoses, feedback, profile.
Uses MongoDB only — no SQLite.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/patient", tags=["Patient API"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
profiles_col = mdb["patient_profiles"] if mdb is not None else None
prescriptions_col = mdb["prescriptions"] if mdb is not None else None
diagnoses_col = mdb["diagnoses"] if mdb is not None else None
feedback_col = mdb["feedback"] if mdb is not None else None
vitals_col = mdb["patient_vitals"] if mdb is not None else None
users_col = mdb["users"] if mdb is not None else None


# ---- Models ----
class BookingCreate(BaseModel):
    patient_email: str
    patient_name: str
    department: str
    doctor_name: Optional[str] = ""
    preferred_date: str
    preferred_time: str
    reason: Optional[str] = ""

class ProfileUpdate(BaseModel):
    phone: Optional[str] = ""
    address: Optional[str] = ""
    emergency_contact: Optional[str] = ""
    blood_group: Optional[str] = ""
    allergies: Optional[str] = ""

class FeedbackSubmit(BaseModel):
    patient_email: Optional[str] = ""
    patient_name: Optional[str] = ""
    department: str
    feedback_text: str
    rating: int


# ---- Appointment Booking (MongoDB) ----
@router.post("/bookings")
def create_booking(body: BookingCreate):
    if bookings_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    now = datetime.utcnow()
    doc = {
        "patient_email": body.patient_email,
        "patient_name": body.patient_name,
        "department": body.department,
        "doctor_name": body.doctor_name,
        "preferred_date": body.preferred_date,
        "preferred_time": body.preferred_time,
        "reason": body.reason,
        "status": "pending",
        "created_at": now.isoformat(),
        "sla_deadline": (now + timedelta(hours=24)).isoformat(),
        "responded_at": None,
    }
    result = bookings_col.insert_one(doc)
    return {"message": "Appointment request submitted", "id": str(result.inserted_id)}


@router.get("/bookings")
def get_my_bookings(patient_email: Optional[str] = None):
    if bookings_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    query = {}
    if patient_email:
        query["patient_email"] = patient_email
    results = bookings_col.find(query).sort("created_at", -1)
    return {
        "bookings": [
            {"id": str(r["_id"]), "department": r.get("department", ""),
             "doctor_name": r.get("doctor_name", ""),
             "preferred_date": r.get("preferred_date", ""),
             "preferred_time": r.get("preferred_time", ""),
             "reason": r.get("reason", ""),
             "status": r.get("status", "pending"),
             "created_at": r.get("created_at", ""),
             "action_note": r.get("action_note", "")}
            for r in results
        ]
    }


# ---- Patient prescriptions & diagnoses ----
@router.get("/my-prescriptions")
def get_my_prescriptions(patient_email: Optional[str] = None):
    if prescriptions_col is None:
        return {"prescriptions": []}
    query = {}
    if patient_email:
        query["patient_email"] = patient_email
    results = prescriptions_col.find(query).sort("created_at", -1)
    return {
        "prescriptions": [
            {"id": str(r["_id"]), "medication": r.get("medication", ""),
             "dosage": r.get("dosage", ""), "frequency": r.get("frequency", ""),
             "duration": r.get("duration", ""), "notes": r.get("notes", ""),
             "doctor_name": r.get("doctor_name", ""), "created_at": r.get("created_at", ""),
             "status": r.get("status", "active")}
            for r in results
        ]
    }


@router.get("/my-diagnoses")
def get_my_diagnoses(patient_email: Optional[str] = None):
    if diagnoses_col is None:
        return {"diagnoses": []}
    query = {}
    if patient_email:
        query["patient_email"] = patient_email
    results = diagnoses_col.find(query).sort("created_at", -1)
    return {
        "diagnoses": [
            {"id": str(r["_id"]), "condition": r.get("condition", ""),
             "severity": r.get("severity", ""), "notes": r.get("notes", ""),
             "doctor_name": r.get("doctor_name", ""), "created_at": r.get("created_at", "")}
            for r in results
        ]
    }


# ---- My Vitals ----
@router.get("/my-vitals")
def get_my_vitals(patient_email: Optional[str] = None):
    if vitals_col is None:
        return {"vitals": []}
    query = {}
    if patient_email:
        query["patient_email"] = patient_email
    results = vitals_col.find(query).sort("recorded_at", -1).limit(50)
    return {
        "vitals": [
            {
                "id": str(v["_id"]),
                "bp_systolic": v.get("bp_systolic"),
                "bp_diastolic": v.get("bp_diastolic"),
                "sugar_level": v.get("sugar_level"),
                "temperature": v.get("temperature"),
                "heart_rate": v.get("heart_rate"),
                "notes": v.get("notes", ""),
                "recorded_at": v.get("recorded_at", ""),
            }
            for v in results
        ]
    }


# ---- Feedback (MongoDB) ----
@router.get("/feedback")
def get_feedback(department: Optional[str] = None):
    if feedback_col is None:
        return {"feedback": [], "total": 0, "avg_rating": 0, "avg_sentiment": 0}

    query = {}
    if department:
        query["department"] = department

    docs = list(feedback_col.find(query).sort("created_at", -1))
    ratings = [d.get("rating", 0) for d in docs if d.get("rating")]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0

    return {
        "feedback": [
            {"id": str(d["_id"]), "department": d.get("department", ""),
             "text": d.get("feedback_text", ""), "rating": d.get("rating", 0),
             "sentiment_score": d.get("sentiment_score", 0),
             "patient_name": d.get("patient_name", ""),
             "created_at": d.get("created_at", "")}
            for d in docs
        ],
        "total": len(docs),
        "avg_rating": round(avg_rating, 2),
        "avg_sentiment": 0,
    }


@router.post("/feedback")
def submit_feedback(body: FeedbackSubmit):
    if feedback_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    sentiment = (body.rating - 3) / 2.0
    doc = {
        "patient_email": body.patient_email,
        "patient_name": body.patient_name,
        "department": body.department,
        "feedback_text": body.feedback_text,
        "rating": body.rating,
        "sentiment_score": sentiment,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = feedback_col.insert_one(doc)
    return {"message": "Feedback submitted", "id": str(result.inserted_id)}


# ---- Profile (MongoDB) ----
@router.get("/profile")
def get_profile(email: str):
    if profiles_col is None:
        return {"profile": None}
    profile = profiles_col.find_one({"email": email})
    if not profile:
        return {"profile": None}
    return {
        "profile": {
            "email": profile.get("email", ""),
            "phone": profile.get("phone", ""),
            "address": profile.get("address", ""),
            "emergency_contact": profile.get("emergency_contact", ""),
            "blood_group": profile.get("blood_group", ""),
            "allergies": profile.get("allergies", ""),
        }
    }


@router.put("/profile")
def update_profile(email: str, body: ProfileUpdate):
    if profiles_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    profiles_col.update_one(
        {"email": email},
        {"$set": {
            "phone": body.phone, "address": body.address,
            "emergency_contact": body.emergency_contact,
            "blood_group": body.blood_group, "allergies": body.allergies,
        }},
        upsert=True,
    )
    return {"message": "Profile updated"}
