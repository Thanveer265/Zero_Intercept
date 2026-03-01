"""
Simulation Lab — staffing changes and outcome prediction.
Uses MongoDB only — no SQLite mock data.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/simulation", tags=["Simulation Lab"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None
users_col = mdb["users"] if mdb is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None


class SimulationParams(BaseModel):
    department: str
    add_staff: int = 0
    extend_shift_hours: float = 0
    reallocate_cases: int = 0
    target_department: Optional[str] = None


@router.post("/run")
def run_simulation(params: SimulationParams):
    """Simulate staffing changes and predict outcomes."""
    dept = params.department

    # Current staff from users
    current_staff = users_col.count_documents({
        "department": dept, "role": {"$in": ["doctor", "nurse"]}
    }) if users_col is not None else 5

    # Active cases from admissions
    active_cases = admissions_col.count_documents({
        "department": dept, "status": {"$in": ["admitted", "pending"]}
    }) if admissions_col is not None else 10

    total_cases = admissions_col.count_documents({
        "department": dept
    }) if admissions_col is not None else 20

    # Estimate resolution metrics from bookings
    avg_res = 8  # default
    sla_rate = 80  # default
    if bookings_col is not None:
        from datetime import datetime
        responded = list(bookings_col.find({
            "department": dept,
            "responded_at": {"$ne": None},
            "created_at": {"$ne": None},
            "sla_deadline": {"$ne": None},
        }))
        if responded:
            total_hrs = 0
            sla_met = 0
            for b in responded:
                try:
                    c_time = datetime.fromisoformat(b["created_at"])
                    r_time = datetime.fromisoformat(b["responded_at"])
                    total_hrs += (r_time - c_time).total_seconds() / 3600
                    if b["responded_at"] <= b["sla_deadline"]:
                        sla_met += 1
                except (ValueError, TypeError):
                    pass
            avg_res = total_hrs / len(responded) if responded else 8
            sla_rate = sla_met / len(responded) * 100 if responded else 80

    # Simulate changes
    new_staff = max(1, current_staff + params.add_staff)
    capacity_change = (new_staff / max(current_staff, 1))

    if params.extend_shift_hours > 0:
        extra_capacity = params.extend_shift_hours / 8.0
        capacity_change += extra_capacity * 0.15

    new_avg_res = avg_res / capacity_change if capacity_change > 0 else avg_res
    new_sla = min(99.5, sla_rate * (capacity_change ** 0.4))

    new_active = active_cases - params.reallocate_cases

    cases_per_staff_before = active_cases / max(current_staff, 1)
    cases_per_staff_after = new_active / max(new_staff, 1)
    efficiency_change = round((1 - cases_per_staff_after / max(cases_per_staff_before, 0.1)) * 100, 1)

    return {
        "current": {
            "staff_count": current_staff,
            "active_cases": active_cases,
            "avg_resolution_hrs": round(avg_res, 2),
            "sla_compliance_pct": round(sla_rate, 1),
            "cases_per_staff": round(cases_per_staff_before, 1),
        },
        "predicted": {
            "staff_count": new_staff,
            "active_cases": max(0, new_active),
            "avg_resolution_hrs": round(new_avg_res, 2),
            "sla_compliance_pct": round(new_sla, 1),
            "cases_per_staff": round(cases_per_staff_after, 1),
        },
        "improvements": {
            "resolution_improvement_pct": round((1 - new_avg_res / max(avg_res, 0.1)) * 100, 1),
            "sla_improvement_pct": round(new_sla - sla_rate, 1),
            "efficiency_change_pct": efficiency_change,
        }
    }
