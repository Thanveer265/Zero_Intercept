"""
Patient-facing API — appointments, cases, feedback, booking, profile.
Uses SQLite for existing data + MongoDB for bookings & profiles.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
from bson import ObjectId
from sqlalchemy.orm import Session
from database import get_db
from models import Case, Appointment, Feedback, Staff
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/patient", tags=["Patient API"])

# MongoDB
MONGO_URI = os.getenv("mongo_db", "")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
profiles_col = mdb["patient_profiles"] if mdb is not None else None
prescriptions_col = mdb["prescriptions"] if mdb is not None else None
diagnoses_col = mdb["diagnoses"] if mdb is not None else None


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
    department: str
    feedback_text: str
    rating: int


# ---- SQLite endpoints ----
@router.get("/appointments")
def get_appointments(department: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Appointment)
    if department:
        query = query.filter(Appointment.department == department)
    appointments = query.order_by(Appointment.slot_time.desc()).all()
    return {
        "appointments": [
            {"id": a.appointment_id, "department": a.department,
             "slot_time": a.slot_time.isoformat() if a.slot_time else None, "attended": a.attended_flag}
            for a in appointments
        ],
        "total": len(appointments),
        "attended": sum(1 for a in appointments if a.attended_flag),
        "missed": sum(1 for a in appointments if not a.attended_flag),
    }


@router.get("/cases")
def get_cases(department: Optional[str] = None, staff_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Case)
    if department:
        query = query.filter(Case.department == department)
    if staff_id:
        query = query.filter(Case.staff_id == staff_id)
    cases = query.order_by(Case.created_time.desc()).all()
    return {
        "cases": [
            {"id": c.case_id, "department": c.department, "severity": c.severity, "status": c.status,
             "staff_id": c.staff_id,
             "created_time": c.created_time.isoformat() if c.created_time else None,
             "resolved_time": c.resolved_time.isoformat() if c.resolved_time else None,
             "sla_deadline": c.sla_deadline.isoformat() if c.sla_deadline else None}
            for c in cases
        ],
        "total": len(cases),
        "open": sum(1 for c in cases if c.status == "Open"),
        "in_progress": sum(1 for c in cases if c.status == "In Progress"),
        "resolved": sum(1 for c in cases if c.status == "Resolved"),
        "escalated": sum(1 for c in cases if c.status == "Escalated"),
    }


@router.get("/feedback")
def get_feedback(department: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Feedback)
    if department:
        query = query.filter(Feedback.department == department)
    feedbacks = query.all()
    avg_rating = sum(f.rating for f in feedbacks) / len(feedbacks) if feedbacks else 0
    avg_sentiment = sum(f.sentiment_score for f in feedbacks) / len(feedbacks) if feedbacks else 0
    return {
        "feedback": [
            {"id": f.feedback_id, "department": f.department, "text": f.feedback_text,
             "rating": f.rating, "sentiment_score": f.sentiment_score}
            for f in feedbacks
        ],
        "total": len(feedbacks), "avg_rating": round(avg_rating, 2), "avg_sentiment": round(avg_sentiment, 3),
    }


@router.post("/feedback")
def submit_feedback(body: FeedbackSubmit, db: Session = Depends(get_db)):
    max_id = db.query(Feedback.feedback_id).order_by(Feedback.feedback_id.desc()).first()
    new_id = (max_id[0] + 1) if max_id else 1
    sentiment = (body.rating - 3) / 2.0
    fb = Feedback(feedback_id=new_id, department=body.department,
                  feedback_text=body.feedback_text, rating=body.rating, sentiment_score=sentiment)
    db.add(fb)
    db.commit()
    return {"message": "Feedback submitted", "id": new_id}


@router.get("/staff")
def get_staff(department: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Staff)
    if department:
        query = query.filter(Staff.department == department)
    staff = query.all()
    return {
        "staff": [
            {"id": s.staff_id, "name": s.name, "department": s.department,
             "shift_hours": s.shift_hours, "cases_handled": s.cases_handled,
             "avg_resolution_time": s.avg_resolution_time, "overtime_hours": s.overtime_hours}
            for s in staff
        ],
        "total": len(staff),
    }


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
             "created_at": r.get("created_at", "")}
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
