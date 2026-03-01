from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/strategic", tags=["Strategic Planning"])

# MongoDB
# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None

users_col = mdb["users"] if mdb is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
wards_col = mdb["wards"] if mdb is not None else None


class ScenarioParams(BaseModel):
    scenario: str = "custom"
    department: str = "all"
    case_volume_pct: float = 100.0
    staff_availability_pct: float = 100.0
    emergency_weight_pct: float = 20.0
    shift_duration_hrs: float = 8.0
    redistribute: bool = False


@router.post("/simulate")
def simulate_scenario(params: ScenarioParams):
    """Predict operational stress points under different scenarios using real MongoDB data."""
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    if params.department != "all":
        departments = [params.department]

    # Preset multipliers
    presets = {
        "pandemic": {"case_mult": 2.5, "staff_reduction": 0.2, "sla_pressure": 1.8},
        "surge_30": {"case_mult": 1.3, "staff_reduction": 0.0, "sla_pressure": 1.3},
        "staff_shortage": {"case_mult": 1.0, "staff_reduction": 0.35, "sla_pressure": 1.5},
    }

    if params.scenario in presets:
        m = presets[params.scenario]
    else:
        # Custom scenario from sliders
        m = {
            "case_mult": params.case_volume_pct / 100.0,
            "staff_reduction": 1.0 - (params.staff_availability_pct / 100.0),
            "sla_pressure": 1.0 + (params.case_volume_pct - 100) / 100.0 * 0.5,
        }

    emergency_factor = params.emergency_weight_pct / 20.0  # normalized to 1.0 at 20%
    shift_factor = 8.0 / max(params.shift_duration_hrs, 4.0)

    results = []
    total_cases_before = 0
    total_cases_after = 0
    total_staff_before = 0
    total_staff_after = 0

    for dept in departments:
        # Get live data from MongoDB
        staff_count = users_col.count_documents({"department": dept}) if users_col is not None else 1
        
        # Determine "active cases" (pending bookings + admitted patients)
        pending_bk = bookings_col.count_documents({"department": dept, "status": "pending"}) if bookings_col is not None else 0
        
        dept_wards = list(wards_col.find({"department": dept})) if wards_col is not None else []
        occupied = sum(w.get("current_patients", 0) for w in dept_wards)
        
        active_cases = pending_bk + occupied
        
        # Estimate avg overtime from backlog
        avg_overtime = max(0, (pending_bk / max(staff_count, 1)) - 2)

        # Apply emergency weight boost for Emergency dept
        dept_case_mult = m["case_mult"]
        if dept == "Emergency":
            dept_case_mult *= (1.0 + (emergency_factor - 1.0) * 0.3)

        projected_cases = round(active_cases * dept_case_mult)
        projected_staff = round(staff_count * (1 - m["staff_reduction"]))
        projected_cps = projected_cases / max(projected_staff, 1)

        stress_level = min(100, round(projected_cps * 8 * shift_factor + avg_overtime * 2))
        risk = "Critical" if stress_level > 80 else "High" if stress_level > 60 else "Medium" if stress_level > 40 else "Low"

        # Additional intelligence fields
        required_additional = max(0, round(projected_cases / 8 - projected_staff)) if stress_level > 60 else 0
        impact_score = min(100, round(stress_level * 0.6 + (projected_cps * 5) + (avg_overtime * 1.5)))

        total_cases_before += active_cases
        total_cases_after += projected_cases
        total_staff_before += staff_count
        total_staff_after += projected_staff

        results.append({
            "department": dept,
            "current_cases": active_cases,
            "projected_cases": projected_cases,
            "current_staff": staff_count,
            "projected_staff": projected_staff,
            "cases_per_staff": round(projected_cps, 1),
            "stress_level": stress_level,
            "risk_level": risk,
            "projected_overtime": round(avg_overtime * m["sla_pressure"], 1),
            "required_additional_staff": required_additional,
            "impact_score": impact_score,
            "recommendations": _get_recommendations(stress_level, dept, projected_staff, projected_cases),
        })

    results.sort(key=lambda x: x["stress_level"], reverse=True)

    # Aggregate metrics
    overall_risk = max(r["stress_level"] for r in results) if results else 0
    critical_count = sum(1 for r in results if r["stress_level"] > 80)
    avg_stress = round(sum(r["stress_level"] for r in results) / max(len(results), 1))

    # SLA breach probability (derived from stress)
    sla_breach_prob = min(95, round(avg_stress * 0.85 + critical_count * 5))

    # Stability score (inverse of stress)
    stability_score = max(0, min(100, 100 - round(avg_stress * 0.8 + critical_count * 8)))

    # Action window (higher stress = shorter window)
    action_window = max(2, round(48 - avg_stress * 0.4))

    scenario_names = {
        "pandemic": "Pandemic Surge Scenario",
        "surge_30": "30% Volume Surge Scenario",
        "staff_shortage": "Staff Shortage Scenario (35% reduction)",
        "custom": "Custom Scenario",
    }

    ai_recommendations = _generate_ai_recommendations(results, overall_risk, sla_breach_prob)

    return {
        "scenario": scenario_names.get(params.scenario, params.scenario),
        "departments": results,
        "overall_risk": overall_risk,
        "sla_breach_probability": sla_breach_prob,
        "stability_score": stability_score,
        "critical_departments": critical_count,
        "action_window_hrs": action_window,
        "forecast_horizon_days": 30,
        "risk_level": "High" if overall_risk > 70 else "Medium" if overall_risk > 40 else "Low",
        "total_cases_before": total_cases_before,
        "total_cases_after": total_cases_after,
        "total_staff_before": total_staff_before,
        "total_staff_after": total_staff_after,
        "ai_recommendations": ai_recommendations,
    }


def _generate_ai_recommendations(departments, overall_risk, sla_breach_prob):
    recs = []
    critical_depts = [d for d in departments if d["stress_level"] > 80]
    high_depts = [d for d in departments if 60 < d["stress_level"] <= 80]

    if critical_depts:
        total_staff_needed = sum(d["required_additional_staff"] for d in critical_depts)
        recs.append({
            "title": f"Deploy {total_staff_needed} additional staff to {len(critical_depts)} critical departments",
            "sla_improvement": min(25, total_staff_needed * 2),
            "financial_impact": total_staff_needed * 75000,
            "confidence": 87,
            "time_to_impact": "24-48 hours",
        })

    if sla_breach_prob > 60:
        recs.append({
            "title": "Activate overtime protocols for high-risk departments",
            "sla_improvement": 12,
            "financial_impact": len(critical_depts) * 150000,
            "confidence": 78,
            "time_to_impact": "4-8 hours",
        })

    if high_depts:
        recs.append({
            "title": f"Redistribute cases from {len(high_depts)} high-stress departments",
            "sla_improvement": 8,
            "financial_impact": 50000,
            "confidence": 72,
            "time_to_impact": "1-2 days",
        })

    if overall_risk > 50:
        recs.append({
            "title": "Implement triage prioritization for non-critical cases",
            "sla_improvement": 5,
            "financial_impact": 25000,
            "confidence": 91,
            "time_to_impact": "2-4 hours",
        })

    recs.append({
        "title": "Schedule preventive staffing review for next quarter",
        "sla_improvement": 3,
        "financial_impact": 200000,
        "confidence": 95,
        "time_to_impact": "30 days",
    })

    return recs[:5]


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
