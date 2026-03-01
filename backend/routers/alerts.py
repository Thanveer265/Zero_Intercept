from fastapi import APIRouter
from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/alerts", tags=["Risk & Alerts"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None

bookings_col = mdb["appointment_bookings"] if mdb is not None else None
prescriptions_col = mdb["prescriptions"] if mdb is not None else None
wards_col = mdb["wards"] if mdb is not None else None


@router.get("/active")
def active_alerts():
    """Generate real-time alerts based on live MongoDB data."""
    alerts = []
    now = datetime.utcnow()

    # 1. SLA Breach / Warning Alerts (from pending bookings)
    if bookings_col is not None:
        pending_bookings = list(bookings_col.find({"status": "pending", "sla_deadline": {"$ne": None}}))
        for b in pending_bookings:
            try:
                sla_dt = datetime.fromisoformat(b["sla_deadline"]) if isinstance(b["sla_deadline"], str) else b["sla_deadline"]
                remaining = (sla_dt - now).total_seconds() / 3600
                if remaining < 0:
                    alerts.append({
                        "id": f"sla-{str(b['_id'])}",
                        "type": "SLA Breach",
                        "severity": "Critical",
                        "message": f"Appointment request for {b.get('patient_name')} in {b.get('department')} has breached SLA by {abs(round(remaining, 1))}hrs",
                        "department": b.get("department", "General"),
                        "timestamp": now.isoformat(),
                    })
                elif remaining < 4:
                    alerts.append({
                        "id": f"sla-warn-{str(b['_id'])}",
                        "type": "SLA Warning",
                        "severity": "High",
                        "message": f"Appointment request for {b.get('patient_name')} in {b.get('department')} will breach SLA in {round(remaining, 1)}hrs",
                        "department": b.get("department", "General"),
                        "timestamp": now.isoformat(),
                    })
            except Exception:
                pass

    # 2. Burnout Alerts (from prescription load)
    if prescriptions_col is not None:
        pipeline = [
            {"$group": {"_id": {"name": "$doctor_name", "dept": "$doctor_department"}, "count": {"$sum": 1}}},
            {"$match": {"count": {"$gte": 5}}}
        ]
        burnout_staff = list(prescriptions_col.aggregate(pipeline))
        for s in burnout_staff:
            count = s["count"]
            alerts.append({
                "id": f"burnout-{s['_id']['name']}",
                "type": "Burnout Risk",
                "severity": "High" if count > 8 else "Warning",
                "message": f"{s['_id']['name']} in {s['_id']['dept']} has {count} active prescriptions (high load)",
                "department": s['_id']['dept'],
                "timestamp": now.isoformat(),
            })

    # 3. Ward Overload (from ward occupancy)
    if wards_col is not None:
        departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
        for dept in departments:
            dept_wards = list(wards_col.find({"department": dept}))
            if dept_wards:
                capacity = sum(w.get("capacity", 0) for w in dept_wards)
                occupied = sum(w.get("current_patients", 0) for w in dept_wards)
                if capacity > 0:
                    ratio = occupied / capacity
                    if ratio > 0.85:
                        alerts.append({
                            "id": f"overload-{dept}",
                            "type": "Capacity Overload",
                            "severity": "High" if ratio > 0.95 else "Warning",
                            "message": f"{dept} is at {round(ratio * 100)}% capacity ({occupied}/{capacity} beds)",
                            "department": dept,
                            "timestamp": now.isoformat(),
                        })

    # Sort by severity
    severity_order = {"Critical": 0, "High": 1, "Warning": 2}
    alerts.sort(key=lambda x: severity_order.get(x["severity"], 3))

    return {
        "alerts": alerts[:50],
        "summary": {
            "total": len(alerts),
            "critical": sum(1 for a in alerts if a["severity"] == "Critical"),
            "high": sum(1 for a in alerts if a["severity"] == "High"),
            "warning": sum(1 for a in alerts if a["severity"] == "Warning"),
        }
    }
