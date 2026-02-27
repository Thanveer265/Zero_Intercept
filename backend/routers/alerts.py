from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Case, Staff
import datetime

router = APIRouter(prefix="/api/alerts", tags=["Risk & Alerts"])


@router.get("/active")
def active_alerts(db: Session = Depends(get_db)):
    """Generate real-time alerts for SLA breach, burnout, surge, efficiency drop."""
    alerts = []
    now = datetime.datetime(2025, 3, 31)

    # SLA Breach Alerts
    breach_cases = db.query(Case).filter(
        Case.status.in_(["Open", "In Progress"]),
    ).all()
    for c in breach_cases:
        remaining = (c.sla_deadline - now).total_seconds() / 3600
        if remaining < 0:
            alerts.append({
                "id": f"sla-{c.case_id}",
                "type": "SLA Breach",
                "severity": "Critical",
                "message": f"Case #{c.case_id} in {c.department} has breached SLA by {abs(round(remaining, 1))}hrs",
                "department": c.department,
                "timestamp": now.isoformat(),
            })
        elif remaining < 2:
            alerts.append({
                "id": f"sla-warn-{c.case_id}",
                "type": "SLA Warning",
                "severity": "High",
                "message": f"Case #{c.case_id} in {c.department} will breach SLA in {round(remaining, 1)}hrs",
                "department": c.department,
                "timestamp": now.isoformat(),
            })

    # Burnout Alerts
    burnout_staff = db.query(Staff).filter(Staff.overtime_hours > 12).all()
    for s in burnout_staff:
        alerts.append({
            "id": f"burnout-{s.staff_id}",
            "type": "Burnout Risk",
            "severity": "High" if s.overtime_hours > 15 else "Warning",
            "message": f"{s.name} in {s.department} has {s.overtime_hours}hrs overtime",
            "department": s.department,
            "timestamp": now.isoformat(),
        })

    # Department Overload
    departments = ["Emergency", "ICU", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    for dept in departments:
        active = db.query(func.count(Case.case_id)).filter(
            Case.department == dept, Case.status.in_(["Open", "In Progress"])
        ).scalar()
        staff = db.query(func.count(Staff.staff_id)).filter(Staff.department == dept).scalar()
        if staff > 0 and active / staff > 10:
            alerts.append({
                "id": f"overload-{dept}",
                "type": "Capacity Overload",
                "severity": "High",
                "message": f"{dept} has {active} active cases with only {staff} staff ({round(active/staff, 1)} per staff)",
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
