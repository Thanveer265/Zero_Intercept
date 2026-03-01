"""
Financial Impact analytics.
Uses MongoDB only — no SQLite mock data.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/financial", tags=["Financial Impact"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None
users_col = mdb["users"] if mdb is not None else None
feedback_col = mdb["patient_feedback"] if mdb is not None else None


class ROIParams(BaseModel):
    additional_budget: float = 0
    overtime_reduction_pct: float = 0
    caseload_adjustment_pct: float = 0


@router.get("/impact")
def financial_impact():
    """Calculate financial impact in INR with extended intelligence."""

    # No-show revenue loss (from bookings)
    total_appointments = bookings_col.count_documents({}) if bookings_col is not None else 0
    no_shows = bookings_col.count_documents({"status": {"$in": ["cancel", "cancelled", "no_show"]}}) if bookings_col is not None else 0
    no_show_rate = round(no_shows / max(total_appointments, 1) * 100, 1)
    avg_appointment_value = 1500
    revenue_loss = no_shows * avg_appointment_value

    # Cost of delay (from bookings with SLA)
    delayed_cases = []
    total_delay_hours = 0
    if bookings_col is not None:
        from datetime import datetime
        responded = list(bookings_col.find({
            "responded_at": {"$ne": None},
            "sla_deadline": {"$ne": None},
        }))
        for b in responded:
            try:
                if b.get("responded_at", "") > b.get("sla_deadline", ""):
                    delayed_cases.append(b)
                    r_time = datetime.fromisoformat(b["responded_at"])
                    s_time = datetime.fromisoformat(b["sla_deadline"])
                    total_delay_hours += (r_time - s_time).total_seconds() / 3600
            except (ValueError, TypeError):
                continue

    cost_per_delay_hour = 800
    delay_cost = round(total_delay_hours * cost_per_delay_hour)

    # Staff costs
    total_staff = users_col.count_documents({"role": {"$in": ["doctor", "nurse"]}}) if users_col is not None else 0
    # Estimate overtime from workload indicators
    total_active = admissions_col.count_documents({"status": {"$in": ["admitted", "pending"]}}) if admissions_col is not None else 0
    estimated_overtime = max(0, (total_active / max(total_staff, 1) - 5) * total_staff * 2)  # estimate
    overtime_rate = 950
    overtime_cost = round(estimated_overtime * overtime_rate)

    # Resource underutilization cost
    avg_utilization = 0.72
    underutilization_cost = round(total_staff * 75000 * (1 - avg_utilization) * 0.3)

    # Emergency premium cost (ICU admissions)
    emergency_cases = admissions_col.count_documents({
        "department": "Emergency", "ward_type": "ICU"
    }) if admissions_col is not None else 0
    emergency_premium_cost = emergency_cases * 2500

    # Budget forecast
    avg_salary_monthly = 75000
    monthly_staff_cost = total_staff * avg_salary_monthly
    monthly_operational = 500000
    monthly_equipment = 250000
    total_monthly = monthly_staff_cost + monthly_operational + monthly_equipment

    # Financial summary metrics
    total_losses = delay_cost + overtime_cost + revenue_loss + underutilization_cost + emergency_premium_cost
    risk_exposure = total_losses
    optimization_potential = round(total_losses * 0.35)
    budget_utilization = round(min(100, (total_losses / max(total_monthly, 1)) * 100 + 65), 1)
    revenue_leakage = round(revenue_loss / max(total_monthly, 1) * 100, 1)
    net_impact = -total_losses

    # Department breakdown
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    dept_costs = []
    for dept in departments:
        dept_staff = users_col.count_documents({
            "department": dept, "role": {"$in": ["doctor", "nurse"]}
        }) if users_col is not None else 0

        dept_noshow = bookings_col.count_documents({
            "department": dept, "status": {"$in": ["cancel", "cancelled", "no_show"]}
        }) if bookings_col is not None else 0

        dept_total_cases = admissions_col.count_documents({"department": dept}) if admissions_col is not None else 0
        dept_resolved = admissions_col.count_documents({
            "department": dept, "status": "discharged"
        }) if admissions_col is not None else 0

        dept_staff_cost = dept_staff * avg_salary_monthly
        dept_overtime_cost = 0  # estimated
        dept_noshow_loss = dept_noshow * avg_appointment_value
        dept_total_cost = dept_staff_cost + dept_overtime_cost + dept_noshow_loss

        cost_per_case = round(dept_total_cost / max(dept_total_cases, 1))
        revenue_per_case = round(avg_appointment_value * 2.5)
        efficiency_score = max(0, min(100, round(
            100 - (dept_noshow / max(dept_total_cases, 1) * 100) * 0.5
        )))

        dept_costs.append({
            "department": dept,
            "staff_cost": dept_staff_cost,
            "overtime_cost": dept_overtime_cost,
            "no_show_loss": dept_noshow_loss,
            "total_cost": dept_total_cost,
            "cost_per_case": cost_per_case,
            "revenue_per_case": revenue_per_case,
            "overtime_ratio": 0,
            "efficiency_score": efficiency_score,
            "total_cases": dept_total_cases,
            "resolved_cases": dept_resolved,
        })

    # Cost drivers breakdown
    cost_drivers = [
        {"name": "Delay Cost", "value": delay_cost, "pct": round(delay_cost / max(total_losses, 1) * 100, 1)},
        {"name": "Overtime Cost", "value": overtime_cost, "pct": round(overtime_cost / max(total_losses, 1) * 100, 1)},
        {"name": "No-show Revenue Loss", "value": revenue_loss, "pct": round(revenue_loss / max(total_losses, 1) * 100, 1)},
        {"name": "Underutilization Cost", "value": underutilization_cost, "pct": round(underutilization_cost / max(total_losses, 1) * 100, 1)},
        {"name": "Emergency Premium", "value": emergency_premium_cost, "pct": round(emergency_premium_cost / max(total_losses, 1) * 100, 1)},
    ]

    # Optimization recommendations
    optimization_recommendations = [
        {
            "title": "Reduce no-show rate by 50% via SMS reminders",
            "savings": round(revenue_loss * 0.5),
            "complexity": "Low",
            "confidence": 88,
        },
        {
            "title": "Optimize shift scheduling to reduce overtime",
            "savings": round(overtime_cost * 0.4),
            "complexity": "Medium",
            "confidence": 82,
        },
        {
            "title": "Implement triage automation for faster resolution",
            "savings": round(delay_cost * 0.3),
            "complexity": "High",
            "confidence": 75,
        },
        {
            "title": "Cross-train staff for multi-department coverage",
            "savings": round(underutilization_cost * 0.6),
            "complexity": "Medium",
            "confidence": 70,
        },
    ]

    return {
        "currency": "INR",
        "currency_symbol": "₹",
        "summary": {
            "risk_exposure": risk_exposure,
            "optimization_potential": optimization_potential,
            "budget_utilization_pct": budget_utilization,
            "revenue_leakage_pct": revenue_leakage,
            "net_impact": net_impact,
        },
        "cost_drivers": cost_drivers,
        "no_show_impact": {
            "total_appointments": total_appointments,
            "no_shows": no_shows,
            "no_show_rate_pct": no_show_rate,
            "revenue_loss": revenue_loss,
        },
        "delay_impact": {
            "delayed_cases": len(delayed_cases),
            "total_delay_hours": round(total_delay_hours, 1),
            "delay_cost": delay_cost,
        },
        "overtime_impact": {
            "total_overtime_hours": round(estimated_overtime, 1),
            "overtime_cost": overtime_cost,
        },
        "budget_forecast": {
            "monthly_staff_cost": monthly_staff_cost,
            "monthly_operational": monthly_operational,
            "monthly_equipment": monthly_equipment,
            "total_monthly": total_monthly,
            "quarterly_forecast": total_monthly * 3,
            "risk_adjusted_quarterly": round(total_monthly * 3 * 1.12),
        },
        "department_breakdown": dept_costs,
        "optimization_recommendations": optimization_recommendations,
    }


@router.post("/simulate-roi")
def simulate_roi(params: ROIParams):
    """Simulate ROI from budget and operational changes."""
    total_staff = users_col.count_documents({"role": {"$in": ["doctor", "nurse"]}}) if users_col is not None else 0
    total_active = admissions_col.count_documents({"status": {"$in": ["admitted", "pending"]}}) if admissions_col is not None else 0
    estimated_overtime = max(0, (total_active / max(total_staff, 1) - 5) * total_staff * 2)
    overtime_cost = round(estimated_overtime * 950)

    # Delay cost from bookings
    delay_cost = 0
    if bookings_col is not None:
        from datetime import datetime
        responded = list(bookings_col.find({
            "responded_at": {"$ne": None},
            "sla_deadline": {"$ne": None},
        }))
        for b in responded:
            try:
                if b.get("responded_at", "") > b.get("sla_deadline", ""):
                    r_time = datetime.fromisoformat(b["responded_at"])
                    s_time = datetime.fromisoformat(b["sla_deadline"])
                    delay_cost += (r_time - s_time).total_seconds() / 3600 * 800
            except (ValueError, TypeError):
                continue
    delay_cost = round(delay_cost)

    # SLA improvement from additional budget
    new_staff = round(params.additional_budget / 75000) if params.additional_budget > 0 else 0
    sla_change = min(20, round(new_staff * 1.5 + params.overtime_reduction_pct * 0.15 - abs(params.caseload_adjustment_pct) * 0.05, 1))

    overtime_savings = round(overtime_cost * params.overtime_reduction_pct / 100)
    delay_savings = round(delay_cost * min(sla_change, 15) / 100)
    cost_reduction = overtime_savings + delay_savings

    net_savings = cost_reduction - params.additional_budget
    breakeven_months = round(params.additional_budget / max(cost_reduction / 12, 1)) if cost_reduction > 0 and params.additional_budget > 0 else 0

    return {
        "sla_change_pct": sla_change,
        "cost_reduction": cost_reduction,
        "net_savings": net_savings,
        "breakeven_months": breakeven_months,
        "new_staff_possible": new_staff,
        "overtime_savings": overtime_savings,
        "delay_savings": delay_savings,
    }
