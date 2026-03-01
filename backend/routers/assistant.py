from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Case, Staff, Feedback, Appointment
import os
import json
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])

# ---------- Gemini setup ----------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

gemini_client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "your-gemini-api-key-here":
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("✅ Gemini AI Assistant initialized successfully")
    except Exception as e:
        print(f"⚠️ Gemini init failed: {e}. Falling back to keyword-based assistant.")


# ---------- Request models ----------
class ChatMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    history: Optional[list[ChatMessage]] = None


# ---------- Build live DB context for Gemini ----------
def _build_db_context(db: Session) -> str:
    total_cases = db.query(func.count(Case.case_id)).scalar()
    active_cases = db.query(func.count(Case.case_id)).filter(
        Case.status.in_(["Open", "In Progress", "Escalated"])
    ).scalar()
    resolved_cases = db.query(func.count(Case.case_id)).filter(Case.status == "Resolved").scalar()

    resolved_with_time = db.query(Case).filter(Case.status == "Resolved", Case.resolved_time.isnot(None)).all()
    avg_resolution = round(
        sum((c.resolved_time - c.created_time).total_seconds() / 3600 for c in resolved_with_time) / len(resolved_with_time), 1
    ) if resolved_with_time else 0

    sla_met = sum(1 for c in resolved_with_time if c.resolved_time <= c.sla_deadline)
    sla_compliance = round(sla_met / len(resolved_with_time) * 100, 1) if resolved_with_time else 0

    # Staff stats
    total_staff = db.query(func.count(Staff.staff_id)).scalar()
    burnout_staff = db.query(func.count(Staff.staff_id)).filter(Staff.overtime_hours > 10).scalar()
    burnout_risk = round(burnout_staff / total_staff * 100, 1) if total_staff else 0

    risky_staff = db.query(Staff).filter(Staff.overtime_hours > 10).order_by(Staff.overtime_hours.desc()).limit(5).all()
    risky_staff_info = [{"name": s.name, "dept": s.department, "overtime": s.overtime_hours, "shift_hrs": s.shift_hours} for s in risky_staff]

    # Department breakdown
    all_cases = db.query(Case).all()
    dept_stats = defaultdict(lambda: {"total": 0, "active": 0, "resolved": 0, "res_time": 0, "sla_met": 0})
    for c in all_cases:
        d = dept_stats[c.department]
        d["total"] += 1
        if c.status in ["Open", "In Progress", "Escalated"]:
            d["active"] += 1
        if c.status == "Resolved" and c.resolved_time:
            d["resolved"] += 1
            d["res_time"] += (c.resolved_time - c.created_time).total_seconds() / 3600
            if c.resolved_time <= c.sla_deadline:
                d["sla_met"] += 1

    dept_summary = []
    for name, s in dept_stats.items():
        avg_res = round(s["res_time"] / s["resolved"], 2) if s["resolved"] else 0
        sla = round(s["sla_met"] / s["resolved"] * 100, 1) if s["resolved"] else 0
        dept_summary.append(f"  - {name}: {s['total']} total, {s['active']} active, {s['resolved']} resolved, avg resolution {avg_res}hrs, SLA compliance {sla}%")
    dept_text = "\n".join(dept_summary)

    # Patient feedback
    feedbacks = db.query(Feedback).all()
    avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0
    negative = sum(1 for f in feedbacks if f.sentiment_score < -0.1)
    total_feedback = len(feedbacks)

    # Financial
    no_shows = db.query(func.count(Appointment.appointment_id)).filter(
        Appointment.attended_flag == False
    ).scalar()
    overtime_total = db.query(func.sum(Staff.overtime_hours)).scalar() or 0

    context = f"""
=== HOSPITAL LIVE DATA (as of now) ===

CASES:
- Total cases: {total_cases}
- Active cases: {active_cases}
- Resolved cases: {resolved_cases}
- Average resolution time: {avg_resolution} hours
- SLA compliance: {sla_compliance}%

STAFF:
- Total staff: {total_staff}
- Staff at burnout risk (>10hrs overtime): {burnout_staff} ({burnout_risk}%)
- Top burnout-risk staff: {json.dumps(risky_staff_info)}

DEPARTMENT BREAKDOWN:
{dept_text}

PATIENT SATISFACTION:
- Average rating: {avg_rating}/5
- Total feedback entries: {total_feedback}
- Negative feedback count: {negative}

FINANCIAL:
- Appointment no-shows: {no_shows} (est. revenue loss: ${no_shows * 150})
- Total overtime hours: {round(overtime_total, 1)} (est. cost: ${round(overtime_total * 85)})
"""
    return context


SYSTEM_PROMPT = """You are MedBot, an AI-powered Hospital Intelligence Assistant for a hospital operations platform called "Zero Intercept".

Your role:
1. Answer questions about hospital operations using the LIVE DATA provided below.
2. Provide actionable insights, recommendations, and strategic advice.
3. Use the actual numbers from the data — never make up statistics.
4. Format responses in clean markdown with **bold** for key numbers and metrics.
5. Keep responses concise but insightful (3-6 sentences typically).
6. When asked about specific departments or staff, reference the data directly.
7. If asked something outside hospital operations, politely redirect to your domain.
8. Always provide a practical insight or recommendation at the end of your response.

Respond in a professional but approachable tone. Use markdown formatting for readability.
"""


# ---------- Main endpoint ----------
@router.post("/query")
def ai_query(request: QueryRequest, db: Session = Depends(get_db)):
    """AI conversational assistant powered by Gemini with live database context."""
    query = request.query

    # If Gemini is available, use it
    if gemini_client:
        try:
            return _gemini_query(query, request.history, db)
        except Exception as e:
            print(f"⚠️ Gemini error: {e}. Falling back to keyword-based.")

    # Fallback to keyword-based system
    return _keyword_fallback(query, db)


def _gemini_query(query: str, history: list[ChatMessage] | None, db: Session) -> dict:
    """Query Gemini with live database context and conversation history."""
    db_context = _build_db_context(db)

    # Build conversation contents for Gemini
    contents = []

    # Add conversation history if available
    if history:
        for msg in history[-10:]:  # Keep last 10 messages for context
            contents.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [{"text": msg.content}]
            })

    # Add current query
    contents.append({
        "role": "user",
        "parts": [{"text": query}]
    })

    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config={
            "system_instruction": SYSTEM_PROMPT + "\n" + db_context,
            "temperature": 0.7,
            "max_output_tokens": 1024,
        }
    )

    response_text = response.text if response.text else "I'm sorry, I couldn't generate a response. Please try rephrasing your question."

    return {
        "response": response_text,
        "insight": None,
        "data": None,
    }


# ---------- Keyword fallback (original system) ----------
def _keyword_fallback(query: str, db: Session) -> dict:
    q = query.lower()
    if any(w in q for w in ["underperform", "worst", "lowest", "poor", "bad department"]):
        return _underperforming_departments(db)
    elif any(w in q for w in ["burnout", "overwork", "tired", "exhausted", "stress"]):
        return _burnout_analysis(db)
    elif any(w in q for w in ["delay", "slow", "late", "sla", "breach"]):
        return _delay_analysis(db)
    elif any(w in q for w in ["staff", "doctor", "nurse", "personnel"]):
        return _staff_analysis(db)
    elif any(w in q for w in ["patient", "feedback", "satisfaction", "complaint"]):
        return _patient_satisfaction(db)
    elif any(w in q for w in ["case", "workload", "volume", "busy"]):
        return _workload_summary(db)
    elif any(w in q for w in ["cost", "money", "budget", "financial", "revenue"]):
        return _financial_summary(db)
    else:
        return _general_summary(db)


def _underperforming_departments(db):
    resolved = db.query(Case).filter(Case.status == "Resolved", Case.resolved_time.isnot(None)).all()
    dept = defaultdict(lambda: {"count": 0, "time": 0, "sla_met": 0})
    for c in resolved:
        hrs = (c.resolved_time - c.created_time).total_seconds() / 3600
        dept[c.department]["count"] += 1
        dept[c.department]["time"] += hrs
        if c.resolved_time <= c.sla_deadline:
            dept[c.department]["sla_met"] += 1

    rankings = []
    for name, d in dept.items():
        avg = d["time"] / d["count"]
        sla = d["sla_met"] / d["count"] * 100
        rankings.append({"department": name, "avg_resolution_hrs": round(avg, 1), "sla_compliance": round(sla, 1)})
    rankings.sort(key=lambda x: x["sla_compliance"])

    worst = rankings[:3] if rankings else []
    return {
        "response": f"The departments with the lowest SLA compliance are: {', '.join(d['department'] for d in worst)}. These departments need immediate attention to improve their case resolution times.",
        "insight": "Consider redistributing workload or adding temporary staff to underperforming departments.",
        "data": worst,
    }


def _burnout_analysis(db):
    staff = db.query(Staff).filter(Staff.overtime_hours > 10).order_by(Staff.overtime_hours.desc()).all()
    data = [{"name": s.name, "department": s.department, "overtime": s.overtime_hours, "shift_hrs": s.shift_hours} for s in staff[:5]]
    return {
        "response": f"**{len(staff)} staff members** are at burnout risk (>10 hours overtime). The most affected include {', '.join(d['name'] for d in data[:3])}.",
        "insight": "Immediate action needed: rotate shifts and limit overtime to prevent medical errors.",
        "data": data,
    }


def _delay_analysis(db):
    delayed = db.query(Case).filter(Case.status.in_(["Open", "In Progress", "Escalated"])).all()
    overdue = [c for c in delayed if c.sla_deadline and c.sla_deadline < c.created_time]
    dept_delays = defaultdict(int)
    for c in delayed:
        dept_delays[c.department] += 1
    top_delayed = sorted(dept_delays.items(), key=lambda x: x[1], reverse=True)[:3]
    return {
        "response": f"There are **{len(delayed)} active cases**, with delays concentrated in {', '.join(d[0] for d in top_delayed)}.",
        "insight": "Focus on the top 3 departments with the most pending cases to reduce SLA violations.",
        "data": [{"department": d[0], "pending_cases": d[1]} for d in top_delayed],
    }


def _staff_analysis(db):
    staff = db.query(Staff).all()
    dept_staff = defaultdict(int)
    for s in staff:
        dept_staff[s.department] += 1
    data = [{"department": d, "staff_count": c} for d, c in sorted(dept_staff.items(), key=lambda x: x[1], reverse=True)]
    return {
        "response": f"We have **{len(staff)} total staff** across {len(dept_staff)} departments. Largest team: {data[0]['department']} ({data[0]['staff_count']} staff).",
        "insight": "Evaluate if staffing aligns with case volume — understaffed departments may need rebalancing.",
        "data": data,
    }


def _patient_satisfaction(db):
    feedbacks = db.query(Feedback).all()
    if not feedbacks:
        return {"response": "No patient feedback data available.", "insight": None, "data": None}
    avg = round(sum(f.rating for f in feedbacks) / len(feedbacks), 2)
    negative = sum(1 for f in feedbacks if f.sentiment_score < -0.1)
    return {
        "response": f"Average patient satisfaction: **{avg}/5** from {len(feedbacks)} responses. **{negative} negative reviews** detected.",
        "insight": "Focus on departments with the lowest ratings and address recurring complaint themes.",
        "data": {"average_rating": avg, "total_responses": len(feedbacks), "negative_count": negative},
    }


def _workload_summary(db):
    total = db.query(func.count(Case.case_id)).scalar()
    active = db.query(func.count(Case.case_id)).filter(Case.status.in_(["Open", "In Progress", "Escalated"])).scalar()
    return {
        "response": f"Current workload: **{total} total cases**, with **{active} active** ({round(active/total*100, 1)}% load).",
        "insight": "If active cases exceed 60% of total, consider activating surge protocols.",
        "data": {"total_cases": total, "active_cases": active, "load_percentage": round(active / total * 100, 1)},
    }


def _financial_summary(db):
    no_shows = db.query(func.count(Appointment.appointment_id)).filter(Appointment.attended_flag == False).scalar()
    overtime = db.query(func.sum(Staff.overtime_hours)).scalar() or 0
    return {
        "response": f"**Financial overview**: {no_shows} appointment no-shows (est. loss: **${no_shows * 150}**). Overtime costs: **${round(overtime * 85)}** ({round(overtime, 1)} hours).",
        "insight": "Implement appointment reminders to reduce no-shows and optimize shift scheduling to lower overtime costs.",
        "data": {"no_shows": no_shows, "no_show_loss": no_shows * 150, "overtime_hours": round(overtime, 1), "overtime_cost": round(overtime * 85)},
    }


def _general_summary(db):
    total = db.query(func.count(Case.case_id)).scalar()
    active = db.query(func.count(Case.case_id)).filter(Case.status.in_(["Open", "In Progress", "Escalated"])).scalar()
    staff = db.query(func.count(Staff.staff_id)).scalar()
    return {
        "response": f"**Hospital Overview**: {total} total cases, {active} active, {staff} staff members on record. Ask me about specific departments, burnout risks, delays, or financials for deeper insights!",
        "insight": "Try asking about specific topics like 'underperforming departments' or 'burnout risk' for detailed analysis.",
        "data": {"total_cases": total, "active_cases": active, "total_staff": staff},
    }
