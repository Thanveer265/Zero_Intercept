"""
Workload analytics — serves real data from MongoDB collections.
Returns the same shape the frontend already expects.
"""
from fastapi import APIRouter
from pymongo import MongoClient
from collections import defaultdict
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/workload", tags=["Workload Analytics"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None

users_col = mdb["users"] if mdb is not None else None
prescriptions_col = mdb["prescriptions"] if mdb is not None else None
diagnoses_col = mdb["diagnoses"] if mdb is not None else None
vitals_col = mdb["patient_vitals"] if mdb is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None


@router.get("/department")
def department_workload():
    """
    Per-department activity from MongoDB.
    total_cases = prescriptions + diagnoses + bookings for the dept.
    active_cases = pending bookings for the dept.
    """
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    results = []

    for dept in departments:
        # Bookings by department
        bk_total = bookings_col.count_documents({"department": dept}) if bookings_col is not None else 0
        bk_pending = bookings_col.count_documents({"department": dept, "status": "pending"}) if bookings_col is not None else 0

        # Prescriptions + diagnoses by doctor department
        rx = prescriptions_col.count_documents({"doctor_department": dept}) if prescriptions_col is not None else 0
        dx = diagnoses_col.count_documents({"doctor_department": dept}) if diagnoses_col is not None else 0

        total = bk_total + rx + dx
        active = bk_pending

        results.append({
            "department": dept,
            "total_cases": total,
            "active_cases": active,
        })

    return results


@router.get("/staff")
def staff_workload():
    """
    Staff workload from MongoDB — prescriptions per doctor.
    """
    if prescriptions_col is None:
        return []

    pipeline = [
        {"$group": {
            "_id": "$doctor_name",
            "cases_handled": {"$sum": 1},
            "department": {"$first": "$doctor_department"},
        }},
        {"$sort": {"cases_handled": -1}},
        {"$limit": 20}
    ]
    results = list(prescriptions_col.aggregate(pipeline))

    return [
        {
            "staff_id": i + 1,
            "name": r["_id"] or "Unknown",
            "department": r.get("department", "General"),
            "cases_handled": r["cases_handled"],
            "shift_hours": 8,
            "overtime_hours": max(0, r["cases_handled"] - 5),
            "avg_resolution_time": round(r["cases_handled"] * 1.2, 1),
        }
        for i, r in enumerate(results)
    ]


@router.get("/hourly-heatmap")
def hourly_heatmap():
    """
    Activity heatmap from MongoDB bookings — by day-of-week and hour.
    """
    heatmap = [[0] * 24 for _ in range(7)]

    if bookings_col is not None:
        bookings = bookings_col.find({}, {"created_at": 1})
        for b in bookings:
            ts = b.get("created_at", "")
            if ts:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
                    dow = dt.weekday()
                    hour = dt.hour
                    heatmap[dow][hour] += 1
                except Exception:
                    pass

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return {"days": days, "hours": list(range(24)), "data": heatmap}


@router.get("/weekly-trend")
def weekly_trend():
    """
    Weekly clinical activity trend from MongoDB.
    Counts prescriptions + diagnoses + bookings per week.
    """
    weekly = defaultdict(int)

    # Count prescriptions per week
    if prescriptions_col is not None:
        for doc in prescriptions_col.find({}, {"created_at": 1}):
            ts = doc.get("created_at", "")
            if ts:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
                    week = dt.isocalendar()[1]
                    year = dt.year
                    weekly[f"{year}-W{week:02d}"] += 1
                except Exception:
                    pass

    # Count diagnoses per week
    if diagnoses_col is not None:
        for doc in diagnoses_col.find({}, {"created_at": 1}):
            ts = doc.get("created_at", "")
            if ts:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
                    week = dt.isocalendar()[1]
                    year = dt.year
                    weekly[f"{year}-W{week:02d}"] += 1
                except Exception:
                    pass

    # Count bookings per week
    if bookings_col is not None:
        for doc in bookings_col.find({}, {"created_at": 1}):
            ts = doc.get("created_at", "")
            if ts:
                try:
                    from datetime import datetime
                    dt = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
                    week = dt.isocalendar()[1]
                    year = dt.year
                    weekly[f"{year}-W{week:02d}"] += 1
                except Exception:
                    pass

    sorted_weeks = sorted(weekly.items())

    # If no data yet, return a single point so the chart shows something
    if not sorted_weeks:
        from datetime import datetime
        now = datetime.now()
        week = now.isocalendar()[1]
        return [{"week": f"{now.year}-W{week:02d}", "cases": 0}]

    return [{"week": w, "cases": cnt} for w, cnt in sorted_weeks]
