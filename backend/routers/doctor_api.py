"""
Doctor API — prescriptions, diagnoses, appointment management.
Uses MongoDB for doctor-specific data.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from pymongo import MongoClient
from bson import ObjectId
from sqlalchemy.orm import Session
from database import get_db
from models import Case, Staff, Appointment
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/doctor", tags=["Doctor API"])

# MongoDB
MONGO_URI = os.getenv("mongo_db", "")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
db = client["zero_intercept"] if client is not None else None
prescriptions_col = db["prescriptions"] if db is not None else None
diagnoses_col = db["diagnoses"] if db is not None else None
bookings_col = db["appointment_bookings"] if db is not None else None


# ---- Models ----
class PrescriptionCreate(BaseModel):
    patient_email: str
    patient_name: str
    medication: str
    dosage: str
    frequency: str
    duration: str
    notes: Optional[str] = ""

class DiagnosisCreate(BaseModel):
    patient_email: str
    patient_name: str
    condition: str
    severity: str  # Mild, Moderate, Severe
    notes: Optional[str] = ""

class CaseStatusUpdate(BaseModel):
    status: str  # Open, Under Treatment, Resolved

class AppointmentAction(BaseModel):
    action: str  # approve, reschedule, cancel
    new_time: Optional[str] = None
    reason: Optional[str] = ""


# ---- Doctor Dashboard data ----
@router.get("/dashboard")
def doctor_dashboard(department: Optional[str] = None, staff_id: Optional[int] = None, db_sql: Session = Depends(get_db)):
    # Today's cases
    cases = db_sql.query(Case)
    if department:
        cases = cases.filter(Case.department == department)
    if staff_id:
        cases = cases.filter(Case.staff_id == staff_id)
    all_cases = cases.all()

    open_cases = [c for c in all_cases if c.status in ("Open", "In Progress")]
    critical = [c for c in all_cases if c.severity == "Critical"]

    # Today's appointments
    appts = db_sql.query(Appointment)
    if department:
        appts = appts.filter(Appointment.department == department)
    all_appts = appts.all()
    today_appts = [a for a in all_appts if a.slot_time and a.slot_time.date() == datetime.now().date()]

    # Pending bookings from MongoDB
    pending_bookings = 0
    if bookings_col is not None:
        query = {"status": "pending"}
        if department:
            query["department"] = department
        pending_bookings = bookings_col.count_documents(query)

    # Recent prescriptions
    recent_rx = 0
    if prescriptions_col is not None:
        query = {}
        if department:
            query["doctor_department"] = department
        recent_rx = prescriptions_col.count_documents(query)

    return {
        "total_cases": len(all_cases),
        "open_cases": len(open_cases),
        "critical_alerts": len(critical),
        "today_appointments": len(today_appts),
        "pending_bookings": pending_bookings,
        "total_prescriptions": recent_rx,
        "cases": [
            {
                "id": c.case_id, "department": c.department, "severity": c.severity,
                "status": c.status, "staff_id": c.staff_id,
                "created_time": c.created_time.isoformat() if c.created_time else None,
                "sla_deadline": c.sla_deadline.isoformat() if c.sla_deadline else None,
            }
            for c in open_cases[:10]
        ],
        "emergency_alerts": [
            {
                "id": c.case_id, "department": c.department, "severity": c.severity,
                "status": c.status, "staff_id": c.staff_id,
                "sla_deadline": c.sla_deadline.isoformat() if c.sla_deadline else None,
            }
            for c in critical[:5]
        ],
    }


# ---- Prescriptions ----
@router.post("/prescriptions")
def add_prescription(body: PrescriptionCreate):
    if prescriptions_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    doc = {
        "patient_email": body.patient_email,
        "patient_name": body.patient_name,
        "medication": body.medication,
        "dosage": body.dosage,
        "frequency": body.frequency,
        "duration": body.duration,
        "notes": body.notes,
        "doctor_name": "",  # filled from frontend
        "doctor_department": "",
        "created_at": datetime.utcnow().isoformat(),
        "status": "active",
    }
    result = prescriptions_col.insert_one(doc)
    return {"message": "Prescription added", "id": str(result.inserted_id)}


@router.get("/prescriptions")
def get_prescriptions(patient_email: Optional[str] = None, department: Optional[str] = None):
    if prescriptions_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    query = {}
    if patient_email:
        query["patient_email"] = patient_email
    if department:
        query["doctor_department"] = department

    results = prescriptions_col.find(query).sort("created_at", -1)
    return {
        "prescriptions": [
            {
                "id": str(r["_id"]),
                "patient_name": r.get("patient_name", ""),
                "patient_email": r.get("patient_email", ""),
                "medication": r.get("medication", ""),
                "dosage": r.get("dosage", ""),
                "frequency": r.get("frequency", ""),
                "duration": r.get("duration", ""),
                "notes": r.get("notes", ""),
                "doctor_name": r.get("doctor_name", ""),
                "created_at": r.get("created_at", ""),
                "status": r.get("status", "active"),
            }
            for r in results
        ]
    }


# ---- Diagnoses ----
@router.post("/diagnoses")
def add_diagnosis(body: DiagnosisCreate):
    if diagnoses_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    doc = {
        "patient_email": body.patient_email,
        "patient_name": body.patient_name,
        "condition": body.condition,
        "severity": body.severity,
        "notes": body.notes,
        "doctor_name": "",
        "doctor_department": "",
        "created_at": datetime.utcnow().isoformat(),
    }
    result = diagnoses_col.insert_one(doc)
    return {"message": "Diagnosis added", "id": str(result.inserted_id)}


@router.get("/diagnoses")
def get_diagnoses(patient_email: Optional[str] = None, department: Optional[str] = None):
    if diagnoses_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    query = {}
    if patient_email:
        query["patient_email"] = patient_email
    if department:
        query["doctor_department"] = department

    results = diagnoses_col.find(query).sort("created_at", -1)
    return {
        "diagnoses": [
            {
                "id": str(r["_id"]),
                "patient_name": r.get("patient_name", ""),
                "patient_email": r.get("patient_email", ""),
                "condition": r.get("condition", ""),
                "severity": r.get("severity", ""),
                "notes": r.get("notes", ""),
                "doctor_name": r.get("doctor_name", ""),
                "created_at": r.get("created_at", ""),
            }
            for r in results
        ]
    }


# ---- Case Status Update ----
@router.put("/cases/{case_id}/status")
def update_case_status(case_id: int, body: CaseStatusUpdate, db_sql: Session = Depends(get_db)):
    case = db_sql.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.status = body.status
    if body.status == "Resolved":
        case.resolved_time = datetime.now()
    db_sql.commit()
    return {"message": f"Case #{case_id} updated to {body.status}"}


# ---- Appointment Bookings ----
@router.get("/bookings")
def get_bookings(department: Optional[str] = None, status: Optional[str] = None):
    if bookings_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    query = {}
    if department:
        query["department"] = department
    if status:
        query["status"] = status

    results = bookings_col.find(query).sort("created_at", -1)
    return {
        "bookings": [
            {
                "id": str(r["_id"]),
                "patient_name": r.get("patient_name", ""),
                "patient_email": r.get("patient_email", ""),
                "department": r.get("department", ""),
                "doctor_name": r.get("doctor_name", ""),
                "preferred_date": r.get("preferred_date", ""),
                "preferred_time": r.get("preferred_time", ""),
                "reason": r.get("reason", ""),
                "status": r.get("status", "pending"),
                "created_at": r.get("created_at", ""),
                "action_note": r.get("action_note", ""),
            }
            for r in results
        ]
    }


@router.put("/bookings/{booking_id}")
def update_booking(booking_id: str, body: AppointmentAction):
    if bookings_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    update = {"status": body.action, "action_note": body.reason, "updated_at": datetime.utcnow().isoformat(), "responded_at": datetime.utcnow().isoformat()}
    if body.action == "reschedule" and body.new_time:
        update["preferred_date"] = body.new_time

    result = bookings_col.update_one({"_id": ObjectId(booking_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")

    return {"message": f"Booking {body.action}d successfully"}
