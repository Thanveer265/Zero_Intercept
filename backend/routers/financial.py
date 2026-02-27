from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Case, Appointment, Staff
from collections import defaultdict

router = APIRouter(prefix="/api/financial", tags=["Financial Impact"])


@router.get("/impact")
def financial_impact(db: Session = Depends(get_db)):
    """Calculate financial impact in INR: revenue loss from no-shows, cost of delay, budget forecast."""

    # No-show revenue loss
    total_appointments = db.query(func.count(Appointment.appointment_id)).scalar()
    no_shows = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.attended_flag == False
    ).scalar()
    no_show_rate = round(no_shows / max(total_appointments, 1) * 100, 1)
    avg_appointment_value = 1500  # INR per appointment
    revenue_loss = no_shows * avg_appointment_value

    # Cost of delay
    resolved = db.query(Case).filter(
        Case.status == "Resolved", Case.resolved_time.isnot(None)
    ).all()
    delayed_cases = [c for c in resolved if c.resolved_time > c.sla_deadline]
    total_delay_hours = sum(
        (c.resolved_time - c.sla_deadline).total_seconds() / 3600
        for c in delayed_cases
    )
    cost_per_delay_hour = 800  # INR
    delay_cost = round(total_delay_hours * cost_per_delay_hour)

    # Overtime cost
    total_overtime = db.query(func.sum(Staff.overtime_hours)).scalar() or 0
    overtime_rate = 950  # INR per hour
    overtime_cost = round(total_overtime * overtime_rate)

    # Budget forecast (monthly projection)
    staff_count = db.query(func.count(Staff.staff_id)).scalar()
    avg_salary_monthly = 75000  # INR
    monthly_staff_cost = staff_count * avg_salary_monthly
    monthly_operational = 500000  # INR
    monthly_equipment = 250000  # INR

    # Department breakdown
    dept_costs = []
    departments = ["Emergency", "ICU", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    for dept in departments:
        dept_staff = db.query(func.count(Staff.staff_id)).filter(Staff.department == dept).scalar()
        dept_overtime = db.query(func.sum(Staff.overtime_hours)).filter(Staff.department == dept).scalar() or 0
        dept_noshow = db.query(func.count(Appointment.appointment_id)).filter(
            Appointment.department == dept, Appointment.attended_flag == False
        ).scalar()
        dept_costs.append({
            "department": dept,
            "staff_cost": dept_staff * avg_salary_monthly,
            "overtime_cost": round(dept_overtime * overtime_rate),
            "no_show_loss": dept_noshow * avg_appointment_value,
        })

    return {
        "currency": "INR",
        "currency_symbol": "₹",
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
            "total_overtime_hours": round(total_overtime, 1),
            "overtime_cost": overtime_cost,
        },
        "budget_forecast": {
            "monthly_staff_cost": monthly_staff_cost,
            "monthly_operational": monthly_operational,
            "monthly_equipment": monthly_equipment,
            "total_monthly": monthly_staff_cost + monthly_operational + monthly_equipment,
            "quarterly_forecast": (monthly_staff_cost + monthly_operational + monthly_equipment) * 3,
        },
        "department_breakdown": dept_costs,
    }
