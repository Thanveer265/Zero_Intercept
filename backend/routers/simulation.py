from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Case, Staff

router = APIRouter(prefix="/api/simulation", tags=["Simulation Lab"])


class SimulationParams(BaseModel):
    department: str
    add_staff: int = 0
    extend_shift_hours: float = 0
    reallocate_cases: int = 0
    target_department: Optional[str] = None


@router.post("/run")
def run_simulation(params: SimulationParams, db: Session = Depends(get_db)):
    """Simulate staffing changes and predict outcomes."""
    dept = params.department

    # Current metrics
    current_staff = db.query(func.count(Staff.staff_id)).filter(Staff.department == dept).scalar()
    active_cases = db.query(func.count(Case.case_id)).filter(
        Case.department == dept, Case.status.in_(["Open", "In Progress"])
    ).scalar()
    total_cases = db.query(func.count(Case.case_id)).filter(Case.department == dept).scalar()
    resolved = db.query(Case).filter(
        Case.department == dept, Case.status == "Resolved", Case.resolved_time.isnot(None)
    ).all()
    avg_res = sum((c.resolved_time - c.created_time).total_seconds() / 3600 for c in resolved) / len(resolved) if resolved else 8

    sla_met = sum(1 for c in resolved if c.resolved_time <= c.sla_deadline)
    sla_rate = sla_met / len(resolved) * 100 if resolved else 80

    # Simulate changes
    new_staff = current_staff + params.add_staff
    capacity_change = (new_staff / max(current_staff, 1))

    # Resolution improvement
    if params.extend_shift_hours > 0:
        extra_capacity = params.extend_shift_hours / 8.0
        capacity_change += extra_capacity * 0.15

    new_avg_res = avg_res / capacity_change if capacity_change > 0 else avg_res
    new_sla = min(99.5, sla_rate * (capacity_change ** 0.4))

    # Cases reallocation impact
    new_active = active_cases - params.reallocate_cases

    # Efficiency change
    cases_per_staff_before = active_cases / max(current_staff, 1)
    cases_per_staff_after = new_active / max(new_staff, 1)
    efficiency_change = round((1 - cases_per_staff_after / max(cases_per_staff_before, 1)) * 100, 1)

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
