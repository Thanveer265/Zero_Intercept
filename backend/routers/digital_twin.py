from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Case, Staff
from collections import defaultdict

router = APIRouter(prefix="/api/digital-twin", tags=["Digital Twin"])


@router.get("/state")
def department_state(db: Session = Depends(get_db)):
    """Visual representation of department operational states."""
    departments = ["Emergency", "ICU", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    result = []

    for dept in departments:
        total = db.query(func.count(Case.case_id)).filter(Case.department == dept).scalar()
        active = db.query(func.count(Case.case_id)).filter(
            Case.department == dept, Case.status.in_(["Open", "In Progress"])
        ).scalar()
        resolved = db.query(func.count(Case.case_id)).filter(
            Case.department == dept, Case.status == "Resolved"
        ).scalar()
        escalated = db.query(func.count(Case.case_id)).filter(
            Case.department == dept, Case.status == "Escalated"
        ).scalar()
        staff_count = db.query(func.count(Staff.staff_id)).filter(
            Staff.department == dept
        ).scalar()
        avg_overtime = db.query(func.avg(Staff.overtime_hours)).filter(
            Staff.department == dept
        ).scalar() or 0

        load_pct = round(active / max(staff_count * 8, 1) * 100, 1)
        if load_pct > 90:
            status = "Critical"
        elif load_pct > 70:
            status = "Warning"
        elif load_pct > 40:
            status = "Normal"
        else:
            status = "Low"

        result.append({
            "department": dept,
            "status": status,
            "load_pct": min(100, load_pct),
            "active_cases": active,
            "resolved_cases": resolved,
            "escalated_cases": escalated,
            "staff_count": staff_count,
            "avg_overtime": round(avg_overtime, 1),
            "queue_length": active,
        })

    # Dependencies
    dependencies = [
        {"from": "Emergency", "to": "ICU", "type": "escalation", "strength": 0.8},
        {"from": "Emergency", "to": "Cardiology", "type": "referral", "strength": 0.5},
        {"from": "Emergency", "to": "Orthopedics", "type": "referral", "strength": 0.4},
        {"from": "ICU", "to": "Neurology", "type": "consultation", "strength": 0.6},
        {"from": "Pediatrics", "to": "Emergency", "type": "escalation", "strength": 0.3},
        {"from": "Cardiology", "to": "ICU", "type": "escalation", "strength": 0.7},
    ]

    return {"departments": result, "dependencies": dependencies}
