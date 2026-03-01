"""
Resolution & SLA analytics.
Uses MongoDB only — no SQLite mock data.
"""
from fastapi import APIRouter
from pymongo import MongoClient
from collections import defaultdict
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/sla", tags=["Resolution & SLA"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None


@router.get("/resolution-trend")
def resolution_trend():
    if bookings_col is None:
        return []

    responded = list(bookings_col.find({
        "responded_at": {"$ne": None},
        "created_at": {"$ne": None},
    }))

    daily = defaultdict(lambda: {"count": 0, "total_time": 0})
    for b in responded:
        try:
            created = b.get("created_at", "")
            responded_at = b.get("responded_at", "")
            if not created or not responded_at:
                continue
            day = responded_at[:10]  # YYYY-MM-DD
            # Approximate hours between creation and response
            from datetime import datetime
            c_time = datetime.fromisoformat(created)
            r_time = datetime.fromisoformat(responded_at)
            hours = (r_time - c_time).total_seconds() / 3600
            daily[day]["count"] += 1
            daily[day]["total_time"] += hours
        except (ValueError, TypeError):
            continue

    return [
        {
            "date": day,
            "resolved_count": d["count"],
            "avg_resolution_hrs": round(d["total_time"] / d["count"], 2) if d["count"] else 0,
        }
        for day, d in sorted(daily.items())
    ]


@router.get("/delayed-percentage")
def delayed_percentage():
    if bookings_col is None:
        return {"delayed_pct": 0, "on_time_pct": 100}

    responded = list(bookings_col.find({
        "responded_at": {"$ne": None},
        "sla_deadline": {"$ne": None},
    }))

    if not responded:
        return {"delayed_pct": 0, "on_time_pct": 100}

    delayed = sum(1 for b in responded if b.get("responded_at", "") > b.get("sla_deadline", ""))
    pct = round(delayed / len(responded) * 100, 1)
    return {
        "delayed_pct": pct,
        "on_time_pct": round(100 - pct, 1),
        "total_resolved": len(responded),
        "delayed_count": delayed,
    }


@router.get("/violation-risk")
def violation_risk():
    """Predict SLA violation risk for pending bookings."""
    if bookings_col is None:
        return []

    from datetime import datetime
    now = datetime.utcnow()
    pending = list(bookings_col.find({"status": "pending", "sla_deadline": {"$ne": None}}))

    risk_data = []
    for b in pending:
        try:
            deadline = datetime.fromisoformat(b.get("sla_deadline", ""))
            time_remaining = (deadline - now).total_seconds() / 3600
            if time_remaining < 0:
                risk = 100
            elif time_remaining < 1:
                risk = 90
            elif time_remaining < 3:
                risk = 70
            elif time_remaining < 6:
                risk = 50
            else:
                risk = 20
            risk_data.append({
                "case_id": str(b["_id"]),
                "department": b.get("department", ""),
                "patient_name": b.get("patient_name", ""),
                "risk_pct": risk,
                "hours_remaining": round(time_remaining, 1),
            })
        except (ValueError, TypeError):
            continue

    risk_data.sort(key=lambda x: x["risk_pct"], reverse=True)
    return risk_data[:50]


@router.get("/department-efficiency")
def department_efficiency():
    if bookings_col is None:
        return []

    from datetime import datetime
    responded = list(bookings_col.find({
        "responded_at": {"$ne": None},
        "created_at": {"$ne": None},
        "sla_deadline": {"$ne": None},
    }))

    dept_stats = defaultdict(lambda: {"count": 0, "total_time": 0, "sla_met": 0})
    for b in responded:
        try:
            dept = b.get("department", "Unknown")
            c_time = datetime.fromisoformat(b.get("created_at", ""))
            r_time = datetime.fromisoformat(b.get("responded_at", ""))
            hrs = (r_time - c_time).total_seconds() / 3600
            dept_stats[dept]["count"] += 1
            dept_stats[dept]["total_time"] += hrs
            if b.get("responded_at", "") <= b.get("sla_deadline", ""):
                dept_stats[dept]["sla_met"] += 1
        except (ValueError, TypeError):
            continue

    results = []
    for dept, stats in dept_stats.items():
        avg_time = round(stats["total_time"] / stats["count"], 2) if stats["count"] else 0
        sla_pct = round(stats["sla_met"] / stats["count"] * 100, 1) if stats["count"] else 0
        efficiency = round((sla_pct * 0.6 + max(0, 100 - avg_time * 5) * 0.4), 1)
        results.append({
            "department": dept,
            "avg_resolution_hrs": avg_time,
            "sla_compliance_pct": sla_pct,
            "efficiency_score": efficiency,
            "cases_resolved": stats["count"],
        })
    results.sort(key=lambda x: x["efficiency_score"], reverse=True)
    return results
