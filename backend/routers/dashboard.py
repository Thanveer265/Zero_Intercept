from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case as sql_case
from database import get_db
from models import Case, Staff
import datetime

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_cases = db.query(func.count(Case.case_id)).scalar()
    active_cases = db.query(func.count(Case.case_id)).filter(
        Case.status.in_(["Open", "In Progress", "Escalated"])
    ).scalar()
    resolved_cases = db.query(func.count(Case.case_id)).filter(
        Case.status == "Resolved"
    ).scalar()

    # Average resolution time (hours)
    resolved = db.query(Case).filter(
        Case.status == "Resolved", Case.resolved_time.isnot(None)
    ).all()
    if resolved:
        total_res_time = sum(
            (c.resolved_time - c.created_time).total_seconds() / 3600
            for c in resolved
        )
        avg_resolution = round(total_res_time / len(resolved), 2)
    else:
        avg_resolution = 0

    # SLA compliance %
    sla_compliant = sum(
        1 for c in resolved if c.resolved_time <= c.sla_deadline
    )
    sla_compliance = round((sla_compliant / len(resolved) * 100), 1) if resolved else 0

    # Burnout risk: % of staff with overtime > 10 hours
    total_staff = db.query(func.count(Staff.staff_id)).scalar()
    burnout_staff = db.query(func.count(Staff.staff_id)).filter(
        Staff.overtime_hours > 10
    ).scalar()
    burnout_risk = round((burnout_staff / total_staff * 100), 1) if total_staff else 0

    # Hospital Health Index (composite score 0-100)
    sla_score = sla_compliance  # out of 100
    resolution_score = max(0, 100 - (avg_resolution * 5))  # lower is better
    burnout_score = max(0, 100 - burnout_risk * 2)
    active_ratio = (1 - active_cases / total_cases) * 100 if total_cases else 50
    health_index = round((sla_score * 0.3 + resolution_score * 0.25 +
                          burnout_score * 0.25 + active_ratio * 0.2), 1)
    health_index = max(0, min(100, health_index))

    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "resolved_cases": resolved_cases,
        "avg_resolution_time_hrs": avg_resolution,
        "sla_compliance_pct": sla_compliance,
        "burnout_risk_pct": burnout_risk,
        "health_index": health_index,
        "trends": {
            "cases_trend": round((active_cases / total_cases) * 100 - 50, 1) if total_cases else 0,
            "sla_trend": round(sla_compliance - 85, 1),
            "burnout_trend": round(burnout_risk - 10, 1),
        }
    }
