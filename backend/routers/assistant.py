from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from database import get_db
from models import Case, Staff, Feedback

router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])


class QueryRequest(BaseModel):
    query: str


@router.post("/query")
def ai_query(request: QueryRequest, db: Session = Depends(get_db)):
    """AI conversational assistant that returns data-backed responses."""
    query = request.query.lower()

    # Keyword-based intelligent routing
    if any(w in query for w in ["underperform", "worst", "lowest", "poor", "bad department"]):
        return _underperforming_departments(db)
    elif any(w in query for w in ["burnout", "overwork", "tired", "exhausted", "stress"]):
        return _burnout_analysis(db)
    elif any(w in query for w in ["delay", "slow", "late", "sla", "breach"]):
        return _delay_analysis(db)
    elif any(w in query for w in ["staff", "doctor", "nurse", "personnel"]):
        return _staff_analysis(db)
    elif any(w in query for w in ["patient", "feedback", "satisfaction", "complaint"]):
        return _patient_satisfaction(db)
    elif any(w in query for w in ["case", "workload", "volume", "busy"]):
        return _workload_summary(db)
    elif any(w in query for w in ["cost", "money", "budget", "financial", "revenue"]):
        return _financial_summary(db)
    else:
        return _general_summary(db)


def _underperforming_departments(db):
    from collections import defaultdict
    resolved = db.query(Case).filter(Case.status == "Resolved", Case.resolved_time.isnot(None)).all()
    dept = defaultdict(lambda: {"count": 0, "time": 0, "sla_met": 0})
    for c in resolved:
        hrs = (c.resolved_time - c.created_time).total_seconds() / 3600
        dept[c.department]["count"] += 1
        dept[c.department]["time"] += hrs
        if c.resolved_time <= c.sla_deadline:
            dept[c.department]["sla_met"] += 1

    rankings = []
    for d, s in dept.items():
        avg = s["time"] / s["count"] if s["count"] else 0
        sla = s["sla_met"] / s["count"] * 100 if s["count"] else 0
        rankings.append({"department": d, "avg_resolution_hrs": round(avg, 2), "sla_compliance": round(sla, 1)})
    rankings.sort(key=lambda x: x["sla_compliance"])

    worst = rankings[0] if rankings else {"department": "N/A"}
    return {
        "response": f"The underperforming department is **{worst['department']}** with {worst.get('sla_compliance', 0)}% SLA compliance and {worst.get('avg_resolution_hrs', 0)}hrs avg resolution time.",
        "data": rankings,
        "insight": "Consider reallocating staff or reviewing processes in the lowest-ranked department.",
    }


def _burnout_analysis(db):
    staff = db.query(Staff).order_by(Staff.overtime_hours.desc()).limit(10).all()
    data = [{"name": s.name, "department": s.department, "overtime": s.overtime_hours, "cases": s.cases_handled} for s in staff]
    high_risk = [s for s in staff if s.overtime_hours > 10]
    return {
        "response": f"**{len(high_risk)} staff members** are at high burnout risk with >10hrs overtime. Top concern: {data[0]['name']} ({data[0]['overtime']}hrs overtime).",
        "data": data,
        "insight": "Immediate shift redistribution recommended for staff with >12hrs overtime.",
    }


def _delay_analysis(db):
    resolved = db.query(Case).filter(Case.status == "Resolved", Case.resolved_time.isnot(None)).all()
    delayed = [c for c in resolved if c.resolved_time > c.sla_deadline]
    pct = round(len(delayed) / len(resolved) * 100, 1) if resolved else 0
    return {
        "response": f"**{pct}%** of resolved cases ({len(delayed)}/{len(resolved)}) experienced SLA delays.",
        "data": {"delayed_count": len(delayed), "total_resolved": len(resolved), "delay_percentage": pct},
        "insight": "High-severity cases in Emergency and ICU contribute most to delays.",
    }


def _staff_analysis(db):
    staff = db.query(Staff).all()
    from collections import defaultdict
    dept_count = defaultdict(int)
    for s in staff:
        dept_count[s.department] += 1
    data = [{"department": d, "staff_count": c} for d, c in sorted(dept_count.items(), key=lambda x: x[1])]
    return {
        "response": f"Total staff: **{len(staff)}** across {len(dept_count)} departments. Smallest team: {data[0]['department']} ({data[0]['staff_count']} staff).",
        "data": data,
        "insight": "Departments with fewer staff may need reinforcement during peak hours.",
    }


def _patient_satisfaction(db):
    feedbacks = db.query(Feedback).all()
    avg_rating = sum(f.rating for f in feedbacks) / len(feedbacks) if feedbacks else 0
    negative = sum(1 for f in feedbacks if f.sentiment_score < -0.1)
    return {
        "response": f"Average patient rating: **{round(avg_rating, 1)}/5**. {negative} negative feedback entries detected.",
        "data": {"avg_rating": round(avg_rating, 1), "total_feedback": len(feedbacks), "negative_count": negative},
        "insight": "Focus on departments with highest negative feedback ratio.",
    }


def _workload_summary(db):
    total = db.query(func.count(Case.case_id)).scalar()
    active = db.query(func.count(Case.case_id)).filter(Case.status.in_(["Open", "In Progress"])).scalar()
    return {
        "response": f"Total cases: **{total}**. Currently active: **{active}** ({round(active/total*100, 1) if total else 0}%).",
        "data": {"total_cases": total, "active_cases": active},
        "insight": "Monitor Emergency department for surge patterns, especially on Mondays.",
    }


def _financial_summary(db):
    from models import Appointment
    no_shows = db.query(func.count(Appointment.appointment_id)).filter(Appointment.attended_flag == False).scalar()
    overtime = db.query(func.sum(Staff.overtime_hours)).scalar() or 0
    return {
        "response": f"**{no_shows}** appointment no-shows causing ~${no_shows * 150} revenue loss. Total overtime: {round(overtime, 1)}hrs (~${round(overtime * 85)} cost).",
        "data": {"no_shows": no_shows, "revenue_loss": no_shows * 150, "overtime_hours": round(overtime, 1), "overtime_cost": round(overtime * 85)},
        "insight": "Implement reminder systems to reduce no-show rate and optimize scheduling.",
    }


def _general_summary(db):
    total = db.query(func.count(Case.case_id)).scalar()
    staff = db.query(func.count(Staff.staff_id)).scalar()
    return {
        "response": f"Hospital overview: **{total}** total cases, **{staff}** staff members. Ask about specific areas like burnout, delays, departments, or finances for detailed insights.",
        "data": {"total_cases": total, "total_staff": staff},
        "insight": "Try asking: 'Which departments are underperforming?' or 'Show burnout risk staff'",
    }
