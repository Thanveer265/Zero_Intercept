from fastapi import APIRouter
from pymongo import MongoClient
import os
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/digital-twin", tags=["Digital Twin"])

MONGO_URI = os.getenv("mongo_db", "")
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None

users_col = mdb["users"] if mdb is not None else None
prescriptions_col = mdb["prescriptions"] if mdb is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
wards_col = mdb["wards"] if mdb is not None else None


@router.get("/state")
def department_state():
    """Visual representation of department operational states using real MongoDB data."""
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    result = []

    for dept in departments:
        # Staff count
        staff_count = users_col.count_documents({"department": dept}) if users_col is not None else 1

        # Queue (pending appointments)
        queue_length = bookings_col.count_documents({"department": dept, "status": "pending"}) if bookings_col is not None else 0
        resolved_cases = bookings_col.count_documents({"department": dept, "status": {"$in": ["approve", "approved"]}}) if bookings_col is not None else 0

        # Ward Occupancy (Physical Load)
        dept_wards = list(wards_col.find({"department": dept})) if wards_col is not None else []
        capacity = sum(w.get("capacity", 0) for w in dept_wards)
        occupied = sum(w.get("current_patients", 0) for w in dept_wards)

        # Prescription load (Proxy for clinical active work)
        active = prescriptions_col.count_documents({"doctor_department": dept}) if prescriptions_col is not None else 0

        # Staffing load %
        load_pct = 0
        if capacity > 0:
            load_pct = (occupied / capacity) * 100
        elif staff_count > 0:
            load_pct = (queue_length + active) / (staff_count * 5) * 100
        
        load_pct = min(100, round(load_pct, 1))

        if load_pct > 90:
            status = "Critical"
        elif load_pct > 70:
            status = "Warning"
        elif load_pct > 40:
            status = "Normal"
        else:
            status = "Low"

        # Overtime approximation based on queue size per staff
        avg_overtime = max(0, queue_length - (staff_count * 2))

        result.append({
            "department": dept,
            "status": status,
            "load_pct": load_pct,
            "active_cases": active + occupied,
            "resolved_cases": resolved_cases,
            "escalated_cases": queue_length, # using queue length as a proxy for escalations/backlog
            "staff_count": staff_count,
            "avg_overtime": round(avg_overtime, 1),
            "queue_length": queue_length,
        })

    # Dependencies (Simulated network topology for the visualizer)
    dependencies = [
        {"from": "Emergency", "to": "Cardiology", "type": "referral", "strength": 0.5},
        {"from": "Emergency", "to": "Orthopedics", "type": "referral", "strength": 0.4},
        {"from": "Pediatrics", "to": "Emergency", "type": "escalation", "strength": 0.3},
        {"from": "Cardiology", "to": "Neurology", "type": "consultation", "strength": 0.6},
    ]

    return {"departments": result, "dependencies": dependencies}
