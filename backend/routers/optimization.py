"""
Optimization Engine — staffing allocation and resource recommendations.
Uses MongoDB only — no SQLite mock data.
"""
from fastapi import APIRouter
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/optimization", tags=["Optimization Engine"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None
users_col = mdb["users"] if mdb is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None


@router.get("/recommend")
def optimization_recommendations():
    """Generate optimal staffing allocation and resource optimization suggestions."""
    departments = ["Emergency", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
    recommendations = []

    total_staff = users_col.count_documents({"role": {"$in": ["doctor", "nurse"]}}) if users_col is not None else 0
    total_active = admissions_col.count_documents({"status": {"$in": ["admitted", "pending"]}}) if admissions_col is not None else 0

    for dept in departments:
        staff_count = users_col.count_documents({
            "department": dept, "role": {"$in": ["doctor", "nurse"]}
        }) if users_col is not None else 0

        active = admissions_col.count_documents({
            "department": dept, "status": {"$in": ["admitted", "pending"]}
        }) if admissions_col is not None else 0

        # Calculate optimal staff
        cases_per_staff = active / max(staff_count, 1)
        optimal_ratio = 5  # target: 5 active cases per staff
        optimal_staff = max(1, round(active / optimal_ratio))
        staff_gap = optimal_staff - staff_count

        # SLA from bookings
        avg_res = 0
        sla_rate = 100
        if bookings_col is not None:
            from datetime import datetime
            responded = list(bookings_col.find({
                "department": dept,
                "responded_at": {"$ne": None},
                "created_at": {"$ne": None},
                "sla_deadline": {"$ne": None},
            }))
            if responded:
                total_hrs = 0
                sla_met = 0
                for b in responded:
                    try:
                        c_time = datetime.fromisoformat(b["created_at"])
                        r_time = datetime.fromisoformat(b["responded_at"])
                        total_hrs += (r_time - c_time).total_seconds() / 3600
                        if b["responded_at"] <= b["sla_deadline"]:
                            sla_met += 1
                    except (ValueError, TypeError):
                        pass
                avg_res = total_hrs / len(responded)
                sla_rate = sla_met / len(responded) * 100

        priority = "High" if staff_gap > 2 or sla_rate < 80 else "Medium" if staff_gap > 0 else "Low"

        recommendations.append({
            "department": dept,
            "current_staff": staff_count,
            "optimal_staff": optimal_staff,
            "staff_gap": staff_gap,
            "active_cases": active,
            "cases_per_staff": round(cases_per_staff, 1),
            "avg_overtime_hrs": 0,  # not tracked in MongoDB users
            "avg_resolution_hrs": round(avg_res, 2),
            "sla_compliance_pct": round(sla_rate, 1),
            "priority": priority,
        })

    recommendations.sort(key=lambda x: x["staff_gap"], reverse=True)

    # Global suggestions
    suggestions = []

    unbalanced = [r for r in recommendations if abs(r["staff_gap"]) > 2]
    if unbalanced:
        suggestions.append({
            "type": "Staff Rebalancing",
            "description": f"{len(unbalanced)} departments have significant staffing gaps.",
            "impact": "High",
            "estimated_improvement": "10-20% improvement in SLA compliance"
        })

    high_load = [r for r in recommendations if r["cases_per_staff"] > 8]
    if high_load:
        suggestions.append({
            "type": "Workload Reduction",
            "description": f"{len(high_load)} departments have high case-per-staff ratios (>8).",
            "impact": "High",
            "estimated_improvement": "15-25% reduction in burnout risk"
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
