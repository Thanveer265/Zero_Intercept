"""
Ward API — CRUD wards, patient admissions/discharges, smart ward suggestions.
MongoDB collections: wards, ward_admissions
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/ward", tags=["Ward Management"])

# MongoDB
MONGO_URI = os.getenv("mongo_db", "")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
wards_col = mdb["wards"] if mdb is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None


# ── Models ──
class WardCreate(BaseModel):
    ward_id: str
    type: str  # ICU, General, Private
    department: str
    capacity: int

class WardAdmission(BaseModel):
    patient_name: str
    patient_email: Optional[str] = ""
    ward_type: str  # ICU, General, Private
    department: str
    assigned_by_doctor: Optional[str] = ""
    notes: Optional[str] = ""


# ═══════════════════════════════════════════
# WARD CRUD
# ═══════════════════════════════════════════

@router.get("/wards")
def list_wards(department: Optional[str] = None):
    """List all wards with current occupancy."""
    if wards_col is None:
        return {"wards": []}
    query = {"department": department} if department else {}
    wards = list(wards_col.find(query))
    return {
        "wards": [
            {
                "ward_id": w["ward_id"],
                "type": w["type"],
                "department": w["department"],
                "capacity": w["capacity"],
                "current_patients": w.get("current_patients", 0),
                "available": w["capacity"] - w.get("current_patients", 0),
            }
            for w in wards
        ]
    }


@router.post("/wards")
def create_ward(ward: WardCreate):
    """Create a new ward (Admin only)."""
    if wards_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    if wards_col.find_one({"ward_id": ward.ward_id}):
        raise HTTPException(status_code=400, detail="Ward ID already exists")
    wards_col.insert_one({
        "ward_id": ward.ward_id,
        "type": ward.type,
        "department": ward.department,
        "capacity": ward.capacity,
        "current_patients": 0,
    })
    return {"message": f"Ward {ward.ward_id} created", "ward_id": ward.ward_id}


@router.put("/wards/{ward_id}")
def update_ward(ward_id: str, capacity: int = None):
    """Update ward capacity (Admin only)."""
    if wards_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    update = {}
    if capacity is not None:
        update["capacity"] = capacity
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    wards_col.update_one({"ward_id": ward_id}, {"$set": update})
    return {"message": f"Ward {ward_id} updated"}


@router.delete("/wards/{ward_id}")
def delete_ward(ward_id: str):
    """Delete a ward (Admin only)."""
    if wards_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    wards_col.delete_one({"ward_id": ward_id})
    return {"message": f"Ward {ward_id} deleted"}


# ═══════════════════════════════════════════
# SMART WARD SUGGESTION
# ═══════════════════════════════════════════

@router.get("/suggest-ward")
def suggest_ward(department: str, ward_type: str):
    """
    Suggest best ward based on department + type + available capacity.
    Returns ward with most free beds.
    """
    if wards_col is None:
        return {"suggestion": None}

    wards = list(wards_col.find({
        "department": department,
        "type": ward_type,
    }))

    if not wards:
        # Fallback: try any ward of this type
        wards = list(wards_col.find({"type": ward_type}))

    if not wards:
        return {"suggestion": None, "message": f"No {ward_type} wards available"}

    # Sort by available beds (most free first)
    wards.sort(key=lambda w: w["capacity"] - w.get("current_patients", 0), reverse=True)
    best = wards[0]
    available = best["capacity"] - best.get("current_patients", 0)

    if available <= 0:
        return {"suggestion": None, "message": f"All {ward_type} wards in {department} are full"}

    return {
        "suggestion": {
            "ward_id": best["ward_id"],
            "type": best["type"],
            "department": best["department"],
            "capacity": best["capacity"],
            "current_patients": best.get("current_patients", 0),
            "available": available,
        }
    }


# ═══════════════════════════════════════════
# PATIENT ADMISSIONS
# ═══════════════════════════════════════════

@router.post("/ward-admission")
def create_admission(admission: WardAdmission):
    """
    Doctor assigns patient to a ward. Creates pending admission.
    Nurse will later confirm by calling /admit/{id}.
    """
    if admissions_col is None or wards_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")

    # Suggest best ward
    wards = list(wards_col.find({
        "department": admission.department,
        "type": admission.ward_type,
    }))
    if not wards:
        wards = list(wards_col.find({"type": admission.ward_type}))
    if not wards:
        raise HTTPException(status_code=404, detail=f"No {admission.ward_type} wards available")

    wards.sort(key=lambda w: w["capacity"] - w.get("current_patients", 0), reverse=True)
    best = wards[0]
    available = best["capacity"] - best.get("current_patients", 0)
    if available <= 0:
        raise HTTPException(status_code=400, detail="All matching wards are full")

    doc = {
        "patient_name": admission.patient_name,
        "patient_email": admission.patient_email,
        "ward_id": best["ward_id"],
        "ward_type": admission.ward_type,
        "department": admission.department,
        "assigned_by_doctor": admission.assigned_by_doctor,
        "admitted_by_nurse": "",
        "notes": admission.notes,
        "status": "pending",  # pending → admitted → discharged
        "created_at": datetime.utcnow().isoformat(),
        "admitted_at": None,
        "discharged_at": None,
    }
    result = admissions_col.insert_one(doc)
    return {
        "message": f"Patient assigned to {best['ward_id']}",
        "id": str(result.inserted_id),
        "ward_id": best["ward_id"],
    }


@router.put("/admit/{admission_id}")
def admit_patient(admission_id: str, nurse_email: str = ""):
    """Nurse confirms patient admission. Updates ward occupancy."""
    if admissions_col is None or wards_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")

    from bson import ObjectId
    admission = admissions_col.find_one({"_id": ObjectId(admission_id)})
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    if admission["status"] != "pending":
        raise HTTPException(status_code=400, detail="Admission already processed")

    now = datetime.utcnow().isoformat()
    admissions_col.update_one(
        {"_id": ObjectId(admission_id)},
        {"$set": {"status": "admitted", "admitted_at": now, "admitted_by_nurse": nurse_email}}
    )
    # Increment ward occupancy
    wards_col.update_one(
        {"ward_id": admission["ward_id"]},
        {"$inc": {"current_patients": 1}}
    )
    return {"message": f"Patient admitted to {admission['ward_id']}", "admitted_at": now}


@router.put("/discharge/{admission_id}")
def discharge_patient(admission_id: str):
    """Nurse discharges patient. Decrements ward occupancy."""
    if admissions_col is None or wards_col is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")

    from bson import ObjectId
    admission = admissions_col.find_one({"_id": ObjectId(admission_id)})
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    if admission["status"] != "admitted":
        raise HTTPException(status_code=400, detail="Patient not currently admitted")

    now = datetime.utcnow().isoformat()
    admissions_col.update_one(
        {"_id": ObjectId(admission_id)},
        {"$set": {"status": "discharged", "discharged_at": now}}
    )
    # Decrement ward occupancy
    wards_col.update_one(
        {"ward_id": admission["ward_id"]},
        {"$inc": {"current_patients": -1}}
    )
    return {"message": f"Patient discharged from {admission['ward_id']}", "discharged_at": now}


@router.get("/admissions")
def list_admissions(ward_id: Optional[str] = None, status: Optional[str] = None):
    """List ward admissions with optional filters."""
    if admissions_col is None:
        return {"admissions": []}
    query = {}
    if ward_id:
        query["ward_id"] = ward_id
    if status:
        query["status"] = status
    results = list(admissions_col.find(query).sort("created_at", -1).limit(50))
    return {
        "admissions": [
            {
                "id": str(r["_id"]),
                "patient_name": r.get("patient_name", ""),
                "patient_email": r.get("patient_email", ""),
                "ward_id": r.get("ward_id", ""),
                "ward_type": r.get("ward_type", ""),
                "department": r.get("department", ""),
                "assigned_by_doctor": r.get("assigned_by_doctor", ""),
                "admitted_by_nurse": r.get("admitted_by_nurse", ""),
                "notes": r.get("notes", ""),
                "status": r.get("status", ""),
                "created_at": r.get("created_at", ""),
                "admitted_at": r.get("admitted_at"),
                "discharged_at": r.get("discharged_at"),
            }
            for r in results
        ]
    }


# ═══════════════════════════════════════════
# SEED INITIAL WARDS
# ═══════════════════════════════════════════

def seed_wards():
    """Seed default wards if none exist."""
    if wards_col is None:
        return
    if wards_col.count_documents({}) > 0:
        print("  Wards already seeded")
        return
    default_wards = [
        {"ward_id": "ICU-EM", "type": "ICU", "department": "Emergency", "capacity": 10, "current_patients": 0},
        {"ward_id": "ICU-CD", "type": "ICU", "department": "Cardiology", "capacity": 8, "current_patients": 0},
        {"ward_id": "ICU-NR", "type": "ICU", "department": "Neurology", "capacity": 6, "current_patients": 0},
        {"ward_id": "GW-EM", "type": "General", "department": "Emergency", "capacity": 30, "current_patients": 0},
        {"ward_id": "GW-CD", "type": "General", "department": "Cardiology", "capacity": 25, "current_patients": 0},
        {"ward_id": "GW-OR", "type": "General", "department": "Orthopedics", "capacity": 25, "current_patients": 0},
        {"ward_id": "GW-PD", "type": "General", "department": "Pediatrics", "capacity": 20, "current_patients": 0},
        {"ward_id": "GW-NR", "type": "General", "department": "Neurology", "capacity": 20, "current_patients": 0},
        {"ward_id": "PW-EM", "type": "Private", "department": "Emergency", "capacity": 15, "current_patients": 0},
        {"ward_id": "PW-CD", "type": "Private", "department": "Cardiology", "capacity": 12, "current_patients": 0},
        {"ward_id": "PW-OR", "type": "Private", "department": "Orthopedics", "capacity": 10, "current_patients": 0},
        {"ward_id": "PW-PD", "type": "Private", "department": "Pediatrics", "capacity": 8, "current_patients": 0},
    ]
    wards_col.insert_many(default_wards)
    print(f"  ✅ Seeded {len(default_wards)} wards")


# Auto-seed on import
seed_wards()
