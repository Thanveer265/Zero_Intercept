"""
Nurse API — patient vitals (BP, sugar, notes), ward management, profiles, shifts.
Uses MongoDB for nurse-specific data.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
from bson import ObjectId
from sqlalchemy.orm import Session
from database import get_db
from models import Case, Staff, Appointment
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/nurse", tags=["Nurse API"])

# MongoDB
MONGO_URI = os.getenv("mongo_db", "")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
vitals_col = mdb["patient_vitals"] if mdb is not None else None
prescriptions_col = mdb["prescriptions"] if mdb is not None else None
nurse_profiles_col = mdb["nurse_profiles"] if mdb is not None else None
shift_schedules_col = mdb["shift_schedules"] if mdb is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None
wards_col = mdb["wards"] if mdb is not None else None


# ── Models ──
class VitalRecord(BaseModel):
    patient_email: str
    patient_name: str
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    sugar_level: Optional[float] = None
    temperature: Optional[float] = None
    heart_rate: Optional[int] = None
    notes: Optional[str] = ""

class NurseProfileUpdate(BaseModel):
    department: Optional[str] = None
    ward_id: Optional[str] = None
    shift: Optional[str] = None  # Morning, Evening, Night

class ShiftSchedule(BaseModel):
    nurse_email: str
    date: str
    shift: str  # Morning, Evening, Night
    ward_id: str


# ═══════════════════════════════════════════
# NURSE DASHBOARD
# ═══════════════════════════════════════════
@router.get("/dashboard")
def nurse_dashboard(department: Optional[str] = None, nurse_email: Optional[str] = None, db_sql: Session = Depends(get_db)):
    # Get nurse profile if available
    profile = None
    if nurse_profiles_col is not None and nurse_email:
        profile = nurse_profiles_col.find_one({"nurse_email": nurse_email})

    assigned_ward = profile.get("ward_id", "") if profile else ""
    assigned_shift = profile.get("shift", "") if profile else ""
    assigned_dept = profile.get("department", department or "") if profile else (department or "")

    # Ward occupancy
    ward_info = None
    if wards_col is not None and assigned_ward:
        ward_info = wards_col.find_one({"ward_id": assigned_ward})

    # Ward stats from SQLite
    cases = db_sql.query(Case)
    if assigned_dept:
        cases = cases.filter(Case.department == assigned_dept)
    all_cases = cases.all()
    open_cases = [c for c in all_cases if c.status in ("Open", "In Progress")]

    # Staff in ward
    staff = db_sql.query(Staff)
    if assigned_dept:
        staff = staff.filter(Staff.department == assigned_dept)
    ward_staff = staff.all()

    # Today's appointments
    appts = db_sql.query(Appointment)
    if assigned_dept:
        appts = appts.filter(Appointment.department == assigned_dept)
    today = [a for a in appts.all() if a.slot_time and a.slot_time.date() == datetime.now().date()]

    # Recent vitals count
    vitals_count = 0
    if vitals_col is not None:
        query = {}
        if assigned_dept:
            query["department"] = assigned_dept
        vitals_count = vitals_col.count_documents(query)

    # Medication schedule (from prescriptions)
    med_schedule = []
    if prescriptions_col is not None:
        query = {"status": "active"}
        if assigned_dept:
            query["doctor_department"] = assigned_dept
        meds = prescriptions_col.find(query).sort("created_at", -1).limit(10)
        med_schedule = [
            {
                "id": str(m["_id"]),
                "patient_name": m.get("patient_name", ""),
                "medication": m.get("medication", ""),
                "dosage": m.get("dosage", ""),
                "frequency": m.get("frequency", ""),
            }
            for m in meds
        ]

    # Pending admissions for this nurse's ward
    pending_admissions = []
    if admissions_col is not None and assigned_ward:
        pending = admissions_col.find({"ward_id": assigned_ward, "status": "pending"}).sort("created_at", -1)
        pending_admissions = [
            {
                "id": str(a["_id"]),
                "patient_name": a.get("patient_name", ""),
                "assigned_by_doctor": a.get("assigned_by_doctor", ""),
                "ward_type": a.get("ward_type", ""),
                "created_at": a.get("created_at", ""),
            }
            for a in pending
        ]

    # Admitted patients in this ward
    admitted_patients = []
    if admissions_col is not None and assigned_ward:
        admitted = admissions_col.find({"ward_id": assigned_ward, "status": "admitted"}).sort("admitted_at", -1)
        admitted_patients = [
            {
                "id": str(a["_id"]),
                "patient_name": a.get("patient_name", ""),
                "admitted_at": a.get("admitted_at", ""),
                "notes": a.get("notes", ""),
            }
            for a in admitted
        ]

    return {
        "ward": assigned_dept or "All",
        "assigned_ward": assigned_ward,
        "assigned_shift": assigned_shift,
        "ward_info": {
            "ward_id": ward_info["ward_id"] if ward_info else "",
            "type": ward_info["type"] if ward_info else "",
            "capacity": ward_info["capacity"] if ward_info else 0,
            "current_patients": ward_info.get("current_patients", 0) if ward_info else 0,
        } if ward_info else None,
        "total_patients": len(open_cases),
        "ward_staff": len(ward_staff),
        "today_appointments": len(today),
        "vitals_recorded": vitals_count,
        "active_cases": [
            {
                "id": c.case_id, "severity": c.severity, "status": c.status,
                "staff_id": c.staff_id, "department": c.department,
            }
            for c in open_cases[:10]
        ],
        "medication_schedule": med_schedule,
        "pending_admissions": pending_admissions,
        "admitted_patients": admitted_patients,
    }


# ═══════════════════════════════════════════
# PATIENT VITALS
# ═══════════════════════════════════════════
@router.post("/vitals")
def record_vitals(body: VitalRecord):
    if vitals_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    doc = {
        "patient_email": body.patient_email,
        "patient_name": body.patient_name,
        "bp_systolic": body.bp_systolic,
        "bp_diastolic": body.bp_diastolic,
        "sugar_level": body.sugar_level,
        "temperature": body.temperature,
        "heart_rate": body.heart_rate,
        "notes": body.notes,
        "recorded_at": datetime.utcnow().isoformat(),
        "department": "",
    }
    result = vitals_col.insert_one(doc)
    return {"message": "Vitals recorded", "id": str(result.inserted_id)}


@router.get("/vitals")
def get_vitals(patient_email: Optional[str] = None, department: Optional[str] = None):
    if vitals_col is None:
        raise HTTPException(status_code=503, detail="Database not available")

    query = {}
    if patient_email:
        query["patient_email"] = patient_email
    if department:
        query["department"] = department

    results = vitals_col.find(query).sort("recorded_at", -1).limit(50)
    return {
        "vitals": [
            {
                "id": str(v["_id"]),
                "patient_name": v.get("patient_name", ""),
                "patient_email": v.get("patient_email", ""),
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


# ═══════════════════════════════════════════
# NURSE PROFILE
# ═══════════════════════════════════════════
@router.get("/profile/{nurse_email}")
def get_nurse_profile(nurse_email: str):
    """Get nurse's ward and shift assignment."""
    if nurse_profiles_col is None:
        return {"profile": None}
    profile = nurse_profiles_col.find_one({"nurse_email": nurse_email})
    if not profile:
        return {"profile": None}
    return {
        "profile": {
            "nurse_email": profile["nurse_email"],
            "department": profile.get("department", ""),
            "ward_id": profile.get("ward_id", ""),
            "shift": profile.get("shift", ""),
        }
    }


@router.post("/profile/{nurse_email}")
def set_nurse_profile(nurse_email: str, body: NurseProfileUpdate):
    """Admin assigns nurse to department, ward, and shift."""
    if nurse_profiles_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")

    update = {}
    if body.department:
        update["department"] = body.department
    if body.ward_id:
        update["ward_id"] = body.ward_id
    if body.shift:
        update["shift"] = body.shift

    nurse_profiles_col.update_one(
        {"nurse_email": nurse_email},
        {"$set": update, "$setOnInsert": {"nurse_email": nurse_email}},
        upsert=True
    )
    return {"message": f"Nurse profile updated for {nurse_email}"}


# ═══════════════════════════════════════════
# SHIFT SCHEDULES
# ═══════════════════════════════════════════
@router.get("/shifts")
def get_shifts(nurse_email: Optional[str] = None, date: Optional[str] = None):
    """Get shift schedule for a nurse or date."""
    if shift_schedules_col is None:
        return {"shifts": []}
    query = {}
    if nurse_email:
        query["nurse_email"] = nurse_email
    if date:
        query["date"] = date
    results = shift_schedules_col.find(query).sort("date", -1).limit(30)
    return {
        "shifts": [
            {
                "id": str(s["_id"]),
                "nurse_email": s.get("nurse_email", ""),
                "date": s.get("date", ""),
                "shift": s.get("shift", ""),
                "ward_id": s.get("ward_id", ""),
                "check_in": s.get("check_in"),
                "check_out": s.get("check_out"),
            }
            for s in results
        ]
    }


@router.post("/shifts")
def create_shift(body: ShiftSchedule):
    """Admin creates a shift schedule for a nurse."""
    if shift_schedules_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    shift_schedules_col.insert_one({
        "nurse_email": body.nurse_email,
        "date": body.date,
        "shift": body.shift,
        "ward_id": body.ward_id,
        "check_in": None,
        "check_out": None,
    })
    return {"message": f"Shift scheduled for {body.nurse_email} on {body.date}"}


@router.put("/shifts/check-in/{shift_id}")
def check_in(shift_id: str):
    """Nurse checks in for their shift."""
    if shift_schedules_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    shift_schedules_col.update_one(
        {"_id": ObjectId(shift_id)},
        {"$set": {"check_in": datetime.utcnow().isoformat()}}
    )
    return {"message": "Checked in"}


@router.put("/shifts/check-out/{shift_id}")
def check_out(shift_id: str):
    """Nurse checks out from their shift."""
    if shift_schedules_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    shift_schedules_col.update_one(
        {"_id": ObjectId(shift_id)},
        {"$set": {"check_out": datetime.utcnow().isoformat()}}
    )
    return {"message": "Checked out"}

