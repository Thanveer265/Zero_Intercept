"""
AI Assistant — conversational hospital intelligence assistant.
Uses MongoDB only — no SQLite mock data.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from pymongo import MongoClient
import os
import json
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None
users_col = mdb["users"] if mdb is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
prescriptions_col = mdb["prescriptions"] if mdb is not None else None
feedback_col = mdb["patient_feedback"] if mdb is not None else None

# ---------- Gemini setup ----------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

gemini_client = None
if GEMINI_API_KEY and GEMINI_API_KEY != "your-gemini-api-key-here":
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        print("[OK] Gemini AI Assistant initialized successfully")
    except Exception as e:
        print(f"[WARN] Gemini init failed: {e}. Falling back to keyword-based assistant.")


# ---------- Request models ----------
class ChatMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    history: Optional[list[ChatMessage]] = None


# ---------- Build live DB context for Gemini ----------
def _build_db_context() -> str:
    # Admissions as cases
    total_cases = admissions_col.count_documents({}) if admissions_col is not None else 0
    active_cases = admissions_col.count_documents({
        "status": {"$in": ["admitted", "pending"]}
    }) if admissions_col is not None else 0
    discharged = admissions_col.count_documents({"status": "discharged"}) if admissions_col is not None else 0

    # Staff stats
    total_staff = users_col.count_documents({"role": {"$in": ["doctor", "nurse"]}}) if users_col is not None else 0
    total_doctors = users_col.count_documents({"role": "doctor"}) if users_col is not None else 0
    total_nurses = users_col.count_documents({"role": "nurse"}) if users_col is not None else 0

    # Department breakdown
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    dept_summary = []
    for dept in departments:
        dept_admissions = admissions_col.count_documents({"department": dept}) if admissions_col is not None else 0
        dept_active = admissions_col.count_documents({
            "department": dept, "status": {"$in": ["admitted", "pending"]}
        }) if admissions_col is not None else 0
        dept_staff = users_col.count_documents({
            "department": dept, "role": {"$in": ["doctor", "nurse"]}
        }) if users_col is not None else 0
        dept_bookings = bookings_col.count_documents({"department": dept}) if bookings_col is not None else 0
        dept_summary.append(f"  - {dept}: {dept_admissions} total admissions, {dept_active} active, {dept_staff} staff, {dept_bookings} bookings")
    dept_text = "\n".join(dept_summary)

    # Patient feedback
    total_feedback = feedback_col.count_documents({}) if feedback_col is not None else 0
    avg_rating = 0
    if feedback_col is not None and total_feedback > 0:
        pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
        result = list(feedback_col.aggregate(pipeline))
        avg_rating = round(result[0]["avg"], 1) if result else 0

    # Bookings
    total_bookings = bookings_col.count_documents({}) if bookings_col is not None else 0
    pending_bookings = bookings_col.count_documents({"status": "pending"}) if bookings_col is not None else 0
    no_shows = bookings_col.count_documents({"status": {"$in": ["cancel", "cancelled", "no_show"]}}) if bookings_col is not None else 0

    # Prescriptions
    total_rx = prescriptions_col.count_documents({}) if prescriptions_col is not None else 0

    context = f"""
=== HOSPITAL LIVE DATA (as of now) ===

ADMISSIONS/CASES:
- Total admissions: {total_cases}
- Active (admitted/pending): {active_cases}
- Discharged: {discharged}

STAFF:
- Total staff: {total_staff} (Doctors: {total_doctors}, Nurses: {total_nurses})

DEPARTMENT BREAKDOWN:
{dept_text}

BOOKINGS:
- Total bookings: {total_bookings}
- Pending: {pending_bookings}
- Cancelled/No-shows: {no_shows}

PRESCRIPTIONS: {total_rx} total

PATIENT SATISFACTION:
- Average rating: {avg_rating}/5
- Total feedback entries: {total_feedback}

FINANCIAL ESTIMATES:
- No-show revenue loss: ₹{no_shows * 1500}
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
def ai_query(request: QueryRequest):
    """AI conversational assistant powered by Gemini with live database context."""
    query = request.query

    # If Gemini is available, use it
    if gemini_client:
        try:
            return _gemini_query(query, request.history)
        except Exception as e:
            print(f"[WARN] Gemini error: {e}. Falling back to keyword-based.")

    # Fallback to keyword-based system
    return _keyword_fallback(query)


def _gemini_query(query: str, history: list[ChatMessage] | None) -> dict:
    """Query Gemini with live database context and conversation history."""
    db_context = _build_db_context()

    contents = []
    if history:
        for msg in history[-10:]:
            contents.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [{"text": msg.content}]
            })

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


# ---------- Keyword fallback ----------
def _keyword_fallback(query: str) -> dict:
    q = query.lower()
    if any(w in q for w in ["underperform", "worst", "lowest", "poor", "bad department"]):
        return _underperforming_departments()
    elif any(w in q for w in ["burnout", "overwork", "tired", "exhausted", "stress"]):
        return _burnout_analysis()
    elif any(w in q for w in ["delay", "slow", "late", "sla", "breach"]):
        return _delay_analysis()
    elif any(w in q for w in ["staff", "doctor", "nurse", "personnel"]):
        return _staff_analysis()
    elif any(w in q for w in ["patient", "feedback", "satisfaction", "complaint"]):
        return _patient_satisfaction()
    elif any(w in q for w in ["case", "workload", "volume", "busy"]):
        return _workload_summary()
    elif any(w in q for w in ["cost", "money", "budget", "financial", "revenue"]):
        return _financial_summary()
    else:
        return _general_summary()


def _underperforming_departments():
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    rankings = []
    for dept in departments:
        total = admissions_col.count_documents({"department": dept}) if admissions_col is not None else 0
        active = admissions_col.count_documents({
            "department": dept, "status": {"$in": ["admitted", "pending"]}
        }) if admissions_col is not None else 0
        load = round(active / max(total, 1) * 100, 1)
        rankings.append({"department": dept, "total_admissions": total, "active": active, "load_pct": load})
    rankings.sort(key=lambda x: x["load_pct"], reverse=True)
    worst = rankings[:3]
    return {
        "response": f"The departments with the highest patient load are: {', '.join(d['department'] for d in worst)}. These departments need immediate attention.",
        "insight": "Consider redistributing workload or adding temporary staff to high-load departments.",
        "data": worst,
    }


def _burnout_analysis():
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    data = []
    for dept in departments:
        staff = users_col.count_documents({
            "department": dept, "role": {"$in": ["doctor", "nurse"]}
        }) if users_col is not None else 0
        active = admissions_col.count_documents({
            "department": dept, "status": {"$in": ["admitted", "pending"]}
        }) if admissions_col is not None else 0
        ratio = round(active / max(staff, 1), 1)
        if ratio > 5:
            data.append({"department": dept, "staff": staff, "active_cases": active, "cases_per_staff": ratio})
    return {
        "response": f"**{len(data)} departments** have high burnout risk (>5 cases per staff member).",
        "insight": "Immediate action needed: redistribute cases and consider hiring temporary staff.",
        "data": data,
    }


def _delay_analysis():
    pending = bookings_col.count_documents({"status": "pending"}) if bookings_col is not None else 0
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    dept_pending = []
    for dept in departments:
        count = bookings_col.count_documents({"department": dept, "status": "pending"}) if bookings_col is not None else 0
        if count > 0:
            dept_pending.append({"department": dept, "pending_cases": count})
    dept_pending.sort(key=lambda x: x["pending_cases"], reverse=True)
    return {
        "response": f"There are **{pending} pending bookings** awaiting response.",
        "insight": "Focus on responding to pending bookings to maintain SLA compliance.",
        "data": dept_pending[:3],
    }


def _staff_analysis():
    total = users_col.count_documents({"role": {"$in": ["doctor", "nurse"]}}) if users_col is not None else 0
    doctors = users_col.count_documents({"role": "doctor"}) if users_col is not None else 0
    nurses = users_col.count_documents({"role": "nurse"}) if users_col is not None else 0
    return {
        "response": f"We have **{total} total staff** — {doctors} doctors and {nurses} nurses.",
        "insight": "Evaluate if staffing aligns with patient volume — understaffed departments may need rebalancing.",
        "data": {"total_staff": total, "doctors": doctors, "nurses": nurses},
    }


def _patient_satisfaction():
    total_feedback = feedback_col.count_documents({}) if feedback_col is not None else 0
    if total_feedback == 0:
        return {"response": "No patient feedback data available.", "insight": None, "data": None}
    pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
    result = list(feedback_col.aggregate(pipeline)) if feedback_col is not None else []
    avg = round(result[0]["avg"], 2) if result else 0
    return {
        "response": f"Average patient satisfaction: **{avg}/5** from {total_feedback} responses.",
        "insight": "Focus on departments with the lowest ratings and address recurring complaint themes.",
        "data": {"average_rating": avg, "total_responses": total_feedback},
    }


def _workload_summary():
    total = admissions_col.count_documents({}) if admissions_col is not None else 0
    active = admissions_col.count_documents({"status": {"$in": ["admitted", "pending"]}}) if admissions_col is not None else 0
    load_pct = round(active / max(total, 1) * 100, 1)
    return {
        "response": f"Current workload: **{total} total admissions**, with **{active} active** ({load_pct}% load).",
        "insight": "If active cases exceed 60% of total, consider activating surge protocols.",
        "data": {"total_cases": total, "active_cases": active, "load_percentage": load_pct},
    }


def _financial_summary():
    no_shows = bookings_col.count_documents({"status": {"$in": ["cancel", "cancelled", "no_show"]}}) if bookings_col is not None else 0
    return {
        "response": f"**Financial overview**: {no_shows} appointment no-shows (est. loss: **₹{no_shows * 1500}**).",
        "insight": "Implement appointment reminders to reduce no-shows and optimize scheduling.",
        "data": {"no_shows": no_shows, "no_show_loss": no_shows * 1500},
    }


def _general_summary():
    total = admissions_col.count_documents({}) if admissions_col is not None else 0
    active = admissions_col.count_documents({"status": {"$in": ["admitted", "pending"]}}) if admissions_col is not None else 0
    staff = users_col.count_documents({"role": {"$in": ["doctor", "nurse"]}}) if users_col is not None else 0
    return {
        "response": f"**Hospital Overview**: {total} total admissions, {active} active, {staff} staff members. Ask me about specific departments, burnout risks, delays, or financials for deeper insights!",
        "insight": "Try asking about specific topics like 'underperforming departments' or 'burnout risk' for detailed analysis.",
        "data": {"total_cases": total, "active_cases": active, "total_staff": staff},
    }
