"""
Predictive Analytics — workload forecast, burnout prediction, surge detection.
Uses MongoDB only — no SQLite mock data.
"""
from fastapi import APIRouter
from pymongo import MongoClient
from collections import defaultdict
import numpy as np
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/predictive", tags=["Predictive Analytics"])

# MongoDB
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("mongo_db") or ""
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000) if MONGO_URI else None
mdb = client["zero_intercept"] if client is not None else None
bookings_col = mdb["appointment_bookings"] if mdb is not None else None
admissions_col = mdb["ward_admissions"] if mdb is not None else None
users_col = mdb["users"] if mdb is not None else None


@router.get("/forecast")
def workload_forecast():
    """ARIMA-style workload forecast for next 7 days using moving average + trend."""
    if bookings_col is None:
        return {"error": "Database not available"}

    all_bookings = list(bookings_col.find({"created_at": {"$ne": None}}))
    daily = defaultdict(int)
    for b in all_bookings:
        try:
            day = b.get("created_at", "")[:10]
            if day:
                daily[day] += 1
        except (TypeError, IndexError):
            continue

    sorted_days = sorted(daily.items())
    values = [v for _, v in sorted_days]

    if len(values) < 7:
        return {"error": "Insufficient data"}

    window = 7
    ma = np.convolve(values, np.ones(window) / window, mode='valid')
    trend = (ma[-1] - ma[0]) / len(ma) if len(ma) > 1 else 0
    base = ma[-1] if len(ma) > 0 else np.mean(values)

    forecast = []
    last_date = datetime.strptime(sorted_days[-1][0], "%Y-%m-%d")
    for i in range(1, 8):
        pred_date = last_date + timedelta(days=i)
        pred_value = max(0, base + trend * i + np.random.normal(0, base * 0.1))
        if pred_date.weekday() == 0:
            pred_value *= 1.3
        if pred_date.weekday() >= 5:
            pred_value *= 0.7
        forecast.append({
            "date": pred_date.strftime("%Y-%m-%d"),
            "predicted_cases": round(pred_value),
            "confidence_pct": round(max(60, 95 - i * 4), 1),
            "lower_bound": round(max(0, pred_value * 0.8)),
            "upper_bound": round(pred_value * 1.2),
        })

    historical = [{"date": d, "cases": v} for d, v in sorted_days[-14:]]
    return {"historical": historical, "forecast": forecast}


@router.get("/burnout")
def burnout_prediction():
    """Burnout risk prediction based on workload indicators from MongoDB."""
    if users_col is None:
        return []

    staff = list(users_col.find({"role": {"$in": ["doctor", "nurse"]}}))
    results = []

    for s in staff:
        # Estimate workload from bookings/admissions
        email = s.get("email", "")
        dept = s.get("department", "")

        # Count active admissions in their department
        dept_admissions = admissions_col.count_documents({
            "department": dept, "status": {"$in": ["admitted", "pending"]}
        }) if admissions_col is not None else 0

        # Count total staff in their department for ratio
        dept_staff = users_col.count_documents({
            "department": dept, "role": {"$in": ["doctor", "nurse"]}
        }) if users_col is not None else 1

        cases_per_staff = dept_admissions / max(dept_staff, 1)
        caseload_factor = cases_per_staff / 5.0

        # Estimate shift intensity and overtime based on load
        shift_intensity = min(1.5, 0.8 + caseload_factor * 0.3)
        overtime_ratio = max(0, (caseload_factor - 0.8) * 0.5)

        # Logistic-style scoring
        z = -2 + overtime_ratio * 3.5 + caseload_factor * 0.8 + shift_intensity * 0.5
        risk_prob = 1 / (1 + np.exp(-z))
        risk_prob = round(min(0.99, max(0.01, risk_prob)), 2)

        risk_level = "Low" if risk_prob < 0.3 else "Medium" if risk_prob < 0.6 else "High" if risk_prob < 0.8 else "Critical"

        results.append({
            "staff_id": str(s["_id"]),
            "name": s.get("name", ""),
            "department": dept,
            "risk_probability": risk_prob,
            "risk_level": risk_level,
            "cases_in_department": dept_admissions,
            "cases_per_staff": round(cases_per_staff, 1),
            "role": s.get("role", ""),
        })
    results.sort(key=lambda x: x["risk_probability"], reverse=True)
    return results


@router.get("/surge")
def surge_detection():
    """Anomaly detection for booking volume surges using z-score method."""
    if bookings_col is None:
        return {"alerts": [], "stats": {}}

    all_bookings = list(bookings_col.find({"created_at": {"$ne": None}}))
    daily = defaultdict(int)
    for b in all_bookings:
        try:
            day = b.get("created_at", "")[:10]
            if day:
                daily[day] += 1
        except (TypeError, IndexError):
            continue

    sorted_days = sorted(daily.items())
    values = np.array([v for _, v in sorted_days], dtype=float)

    if len(values) == 0:
        return {"alerts": [], "stats": {"mean_daily_cases": 0, "std_deviation": 0, "total_surge_days": 0}}

    mean_val = np.mean(values)
    std_val = np.std(values) if np.std(values) > 0 else 1

    alerts = []
    for date_str, count in sorted_days:
        z = (count - mean_val) / std_val
        if z > 1.5:
            severity = "Critical" if z > 3 else "High" if z > 2.5 else "Warning"
            alerts.append({
                "date": date_str,
                "cases": count,
                "z_score": round(z, 2),
                "severity": severity,
                "expected": round(mean_val),
                "deviation_pct": round((count - mean_val) / mean_val * 100, 1)
            })

    stats = {
        "mean_daily_cases": round(mean_val, 1),
        "std_deviation": round(std_val, 1),
        "total_surge_days": len(alerts),
    }
    alerts.sort(key=lambda x: x["z_score"], reverse=True)
    return {"alerts": alerts[:20], "stats": stats}
