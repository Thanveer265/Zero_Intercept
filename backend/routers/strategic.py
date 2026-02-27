from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from database import get_db
from models import Case, Staff

router = APIRouter(prefix="/api/strategic", tags=["Strategic Planning"])


class ScenarioParams(BaseModel):
    scenario: str  # "pandemic", "surge_30", "staff_shortage"
    department: str = "all"


@router.post("/simulate")
def simulate_scenario(params: ScenarioParams, db: Session = Depends(get_db)):
    """Predict operational stress points under different scenarios."""
    departments = ["Emergency", "ICU", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    if params.department != "all":
        departments = [params.department]

    multipliers = {
        "pandemic": {"case_mult": 2.5, "staff_reduction": 0.2, "sla_pressure": 1.8},
        "surge_30": {"case_mult": 1.3, "staff_reduction": 0.0, "sla_pressure": 1.3},
        "staff_shortage": {"case_mult": 1.0, "staff_reduction": 0.35, "sla_pressure": 1.5},
    }
    m = multipliers.get(params.scenario, multipliers["surge_30"])

    results = []
    for dept in departments:
        active = db.query(func.count(Case.case_id)).filter(
            Case.department == dept, Case.status.in_(["Open", "In Progress"])
        ).scalar()
        staff_count = db.query(func.count(Staff.staff_id)).filter(Staff.department == dept).scalar()
        avg_overtime = db.query(func.avg(Staff.overtime_hours)).filter(Staff.department == dept).scalar() or 0

        projected_cases = round(active * m["case_mult"])
        projected_staff = round(staff_count * (1 - m["staff_reduction"]))
        projected_cps = projected_cases / max(projected_staff, 1)

        stress_level = min(100, round(projected_cps * 8 + avg_overtime * 2))
        risk = "Critical" if stress_level > 80 else "High" if stress_level > 60 else "Medium" if stress_level > 40 else "Low"

        results.append({
            "department": dept,
            "current_cases": active,
            "projected_cases": projected_cases,
            "current_staff": staff_count,
            "projected_staff": projected_staff,
            "cases_per_staff": round(projected_cps, 1),
            "stress_level": stress_level,
            "risk_level": risk,
            "projected_overtime": round(avg_overtime * m["sla_pressure"], 1),
            "recommendations": _get_recommendations(stress_level, dept, projected_staff, projected_cases),
        })

    results.sort(key=lambda x: x["stress_level"], reverse=True)

    scenario_names = {
        "pandemic": "Pandemic Surge Scenario",
        "surge_30": "30% Volume Surge Scenario",
        "staff_shortage": "Staff Shortage Scenario (35% reduction)",
    }

    return {
        "scenario": scenario_names.get(params.scenario, params.scenario),
        "departments": results,
        "overall_risk": max(r["stress_level"] for r in results) if results else 0,
    }


def _get_recommendations(stress, dept, staff, cases):
    recs = []
    if stress > 80:
        recs.append(f"Immediately add {max(2, cases // 10)} temporary staff to {dept}")
        recs.append("Activate emergency protocol and prioritize critical cases only")
    elif stress > 60:
        recs.append(f"Add {max(1, cases // 15)} staff to {dept}")
        recs.append("Extend shift hours by 2h for existing staff")
    elif stress > 40:
        recs.append("Monitor closely and prepare contingency staff")
    else:
        recs.append("Current staffing adequate for projected demand")
    return recs
