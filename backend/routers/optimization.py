from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Case, Staff

router = APIRouter(prefix="/api/optimization", tags=["Optimization Engine"])


@router.get("/recommend")
def optimization_recommendations(db: Session = Depends(get_db)):
    """Generate optimal staffing allocation and resource optimization suggestions."""
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    recommendations = []

    total_staff = db.query(func.count(Staff.staff_id)).scalar()
    total_active = db.query(func.count(Case.case_id)).filter(
        Case.status.in_(["Open", "In Progress"])
    ).scalar()

    for dept in departments:
        staff_count = db.query(func.count(Staff.staff_id)).filter(Staff.department == dept).scalar()
        active = db.query(func.count(Case.case_id)).filter(
            Case.department == dept, Case.status.in_(["Open", "In Progress"])
        ).scalar()
        avg_overtime = db.query(func.avg(Staff.overtime_hours)).filter(Staff.department == dept).scalar() or 0

        # Calculate optimal staff
        cases_per_staff = active / max(staff_count, 1)
        optimal_ratio = 5  # target: 5 active cases per staff
        optimal_staff = max(1, round(active / optimal_ratio))
        staff_gap = optimal_staff - staff_count

        # Delay risk
        resolved = db.query(Case).filter(
            Case.department == dept, Case.status == "Resolved", Case.resolved_time.isnot(None)
        ).all()
        if resolved:
            avg_res = sum((c.resolved_time - c.created_time).total_seconds() / 3600 for c in resolved) / len(resolved)
            sla_met = sum(1 for c in resolved if c.resolved_time <= c.sla_deadline)
            sla_rate = sla_met / len(resolved) * 100
        else:
            avg_res = 0
            sla_rate = 100

        priority = "High" if staff_gap > 2 or sla_rate < 80 else "Medium" if staff_gap > 0 else "Low"

        recommendations.append({
            "department": dept,
            "current_staff": staff_count,
            "optimal_staff": optimal_staff,
            "staff_gap": staff_gap,
            "active_cases": active,
            "cases_per_staff": round(cases_per_staff, 1),
            "avg_overtime_hrs": round(avg_overtime, 1),
            "avg_resolution_hrs": round(avg_res, 2),
            "sla_compliance_pct": round(sla_rate, 1),
            "priority": priority,
        })

    recommendations.sort(key=lambda x: x["staff_gap"], reverse=True)

    # Global suggestions
    suggestions = []
    high_overtime = db.query(Staff).filter(Staff.overtime_hours > 10).all()
    if high_overtime:
        suggestions.append({
            "type": "Overtime Reduction",
            "description": f"{len(high_overtime)} staff members have >10hrs overtime. Consider redistributing cases.",
            "impact": "High",
            "estimated_improvement": "15-25% reduction in burnout risk"
        })

    unbalanced = [r for r in recommendations if abs(r["staff_gap"]) > 2]
    if unbalanced:
        suggestions.append({
            "type": "Staff Rebalancing",
            "description": f"{len(unbalanced)} departments have significant staffing gaps.",
            "impact": "High",
            "estimated_improvement": "10-20% improvement in SLA compliance"
        })

    suggestions.append({
        "type": "Shift Optimization",
        "description": "Align peak staffing with high-volume hours (8am-12pm, 6pm-10pm).",
        "impact": "Medium",
        "estimated_improvement": "8-15% reduction in resolution time"
    })

    return {
        "allocations": recommendations,
        "suggestions": suggestions,
        "summary": {
            "total_staff": total_staff,
            "total_active_cases": total_active,
            "avg_cases_per_staff": round(total_active / max(total_staff, 1), 1),
        }
    }
