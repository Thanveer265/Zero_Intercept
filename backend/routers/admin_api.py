"""
Admin API — aggregates data from MongoDB collections used by Doctor, Nurse, Patient.
Provides admin-level overview of all clinical activity.
Uses MongoDB only — no SQLite mock data.
"""
from fastapi import APIRouter
from typing import Optional
from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/admin", tags=["Admin API"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None

# Collections
users_col = mdb["users"] if mdb is not None else None
prescriptions_col = mdb["prescriptions"] if mdb is not None else None
diagnoses_col = mdb["diagnoses"] if mdb is not None else None
vitals_col = mdb["patient_vitals"] if mdb is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
profiles_col = mdb["patient_profiles"] if mdb is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None
feedback_col = mdb["patient_feedback"] if mdb is not None else None


@router.get("/dashboard")
def admin_dashboard():
    """Aggregated dashboard from MongoDB."""

    # ── User stats ──
    total_users = users_col.count_documents({}) if users_col is not None else 0
    doctors = users_col.count_documents({"role": "doctor"}) if users_col is not None else 0
    nurses = users_col.count_documents({"role": "nurse"}) if users_col is not None else 0
    patients = users_col.count_documents({"role": "patient"}) if users_col is not None else 0
    admins = users_col.count_documents({"role": "admin"}) if users_col is not None else 0

    # ── Clinical activity ──
    total_prescriptions = prescriptions_col.count_documents({}) if prescriptions_col is not None else 0
    active_prescriptions = prescriptions_col.count_documents({"status": "active"}) if prescriptions_col is not None else 0

    total_diagnoses = diagnoses_col.count_documents({}) if diagnoses_col is not None else 0
    total_vitals = vitals_col.count_documents({}) if vitals_col is not None else 0

    total_bookings = bookings_col.count_documents({}) if bookings_col is not None else 0
    pending_bookings = bookings_col.count_documents({"status": "pending"}) if bookings_col is not None else 0
    approved_bookings = bookings_col.count_documents({"status": {"$in": ["approve", "approved"]}}) if bookings_col is not None else 0
    cancelled_bookings = bookings_col.count_documents({"status": {"$in": ["cancel", "cancelled"]}}) if bookings_col is not None else 0

    total_profiles = profiles_col.count_documents({}) if profiles_col is not None else 0

    # ── Admissions (replaces SQLite cases) ──
    total_admissions = admissions_col.count_documents({}) if admissions_col is not None else 0
    active_admissions = admissions_col.count_documents({"status": {"$in": ["admitted", "pending"]}}) if admissions_col is not None else 0
    discharged = admissions_col.count_documents({"status": "discharged"}) if admissions_col is not None else 0

    # ── Staff count from users ──
    total_staff = users_col.count_documents({"role": {"$in": ["doctor", "nurse"]}}) if users_col is not None else 0

    # ── Feedback ──
    total_feedback = feedback_col.count_documents({}) if feedback_col is not None else 0
    avg_rating = 0
    if feedback_col is not None and total_feedback > 0:
        pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
        result = list(feedback_col.aggregate(pipeline))
        avg_rating = round(result[0]["avg"], 1) if result else 0

    # ── SLA compliance from bookings ──
    sla_compliance = 0
    if bookings_col is not None:
        responded = list(bookings_col.find({"responded_at": {"$ne": None}, "sla_deadline": {"$ne": None}}))
        if responded:
            sla_met = sum(1 for b in responded if b.get("responded_at", "") <= b.get("sla_deadline", ""))
            sla_compliance = round(sla_met / len(responded) * 100, 1)

    return {
        # User accounts
        "total_users": total_users,
        "doctors": doctors,
        "nurses": nurses,
        "patients": patients,
        "admins": admins,

        # Clinical activity
        "total_prescriptions": total_prescriptions,
        "active_prescriptions": active_prescriptions,
        "total_diagnoses": total_diagnoses,
        "total_vitals": total_vitals,
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "approved_bookings": approved_bookings,
        "cancelled_bookings": cancelled_bookings,
        "total_profiles": total_profiles,

        # Operational (from MongoDB)
        "total_cases": total_admissions,
        "active_cases": active_admissions,
        "resolved_cases": discharged,
        "total_staff": total_staff,
        "total_feedback": total_feedback,
        "avg_rating": avg_rating,
        "sla_compliance": sla_compliance,
    }


@router.get("/recent-prescriptions")
def recent_prescriptions(limit: int = 15):
    """Recent prescriptions from MongoDB."""
    if prescriptions_col is None:
        return {"prescriptions": []}
    results = prescriptions_col.find().sort("created_at", -1).limit(limit)
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
                "doctor_name": r.get("doctor_name", ""),
                "status": r.get("status", "active"),
                "created_at": r.get("created_at", ""),
            }
            for r in results
        ]
    }


@router.get("/recent-diagnoses")
def recent_diagnoses(limit: int = 15):
    """Recent diagnoses from MongoDB."""
    if diagnoses_col is None:
        return {"diagnoses": []}
    results = diagnoses_col.find().sort("created_at", -1).limit(limit)
    return {
        "diagnoses": [
            {
                "id": str(r["_id"]),
                "patient_name": r.get("patient_name", ""),
                "condition": r.get("condition", ""),
                "severity": r.get("severity", ""),
                "notes": r.get("notes", ""),
                "doctor_name": r.get("doctor_name", ""),
                "created_at": r.get("created_at", ""),
            }
            for r in results
        ]
    }


@router.get("/recent-vitals")
def recent_vitals(limit: int = 15):
    """Recent vitals from MongoDB."""
    if vitals_col is None:
        return {"vitals": []}
    results = vitals_col.find().sort("recorded_at", -1).limit(limit)
    return {
        "vitals": [
            {
                "id": str(r["_id"]),
                "patient_name": r.get("patient_name", ""),
                "bp_systolic": r.get("bp_systolic"),
                "bp_diastolic": r.get("bp_diastolic"),
                "sugar_level": r.get("sugar_level"),
                "temperature": r.get("temperature"),
                "heart_rate": r.get("heart_rate"),
                "recorded_at": r.get("recorded_at", ""),
            }
            for r in results
        ]
    }


@router.get("/recent-bookings")
def recent_bookings(limit: int = 15):
    """Recent appointment bookings from MongoDB."""
    if bookings_col is None:
        return {"bookings": []}
    results = bookings_col.find().sort("created_at", -1).limit(limit)
    return {
        "bookings": [
            {
                "id": str(r["_id"]),
                "patient_name": r.get("patient_name", ""),
                "department": r.get("department", ""),
                "doctor_name": r.get("doctor_name", ""),
                "preferred_date": r.get("preferred_date", ""),
                "preferred_time": r.get("preferred_time", ""),
                "status": r.get("status", "pending"),
                "created_at": r.get("created_at", ""),
            }
            for r in results
        ]
    }


@router.get("/department-stats")
def department_stats():
    """Per-department stats from MongoDB."""
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    results = []

    for dept in departments:
        # Admissions as cases
        cases = admissions_col.count_documents({"department": dept}) if admissions_col is not None else 0
        active = admissions_col.count_documents({
            "department": dept, "status": {"$in": ["admitted", "pending"]}
        }) if admissions_col is not None else 0

        # Staff from users
        staff = users_col.count_documents({
            "department": dept, "role": {"$in": ["doctor", "nurse"]}
        }) if users_col is not None else 0

        # MongoDB clinical data
        rx = prescriptions_col.count_documents({"doctor_department": dept}) if prescriptions_col is not None else 0
        dx = diagnoses_col.count_documents({"doctor_department": dept}) if diagnoses_col is not None else 0
        bk = bookings_col.count_documents({"department": dept}) if bookings_col is not None else 0
        users = users_col.count_documents({"department": dept}) if users_col is not None else 0

        results.append({
            "department": dept,
            "total_cases": cases,
            "active_cases": active,
            "staff": staff,
            "prescriptions": rx,
            "diagnoses": dx,
            "bookings": bk,
            "users": users,
        })

    return {"departments": results}
