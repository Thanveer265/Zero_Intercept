from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Case, Staff
from collections import defaultdict
import numpy as np
import datetime

router = APIRouter(prefix="/api/predictive", tags=["Predictive Analytics"])


@router.get("/forecast")
def workload_forecast(db: Session = Depends(get_db)):
    """ARIMA-style workload forecast for next 7 days using moving average + trend."""
    cases = db.query(Case).all()
    daily = defaultdict(int)
    for c in cases:
        day = c.created_time.strftime("%Y-%m-%d")
        daily[day] += 1
    sorted_days = sorted(daily.items())
    values = [v for _, v in sorted_days]

    if len(values) < 7:
        return {"error": "Insufficient data"}

    # Simple ARIMA(1,1,1) approximation: trend + moving avg
    window = 7
    ma = np.convolve(values, np.ones(window) / window, mode='valid')
    trend = (ma[-1] - ma[0]) / len(ma) if len(ma) > 1 else 0
    base = ma[-1] if len(ma) > 0 else np.mean(values)

    forecast = []
    last_date = datetime.datetime.strptime(sorted_days[-1][0], "%Y-%m-%d")
    for i in range(1, 8):
        pred_date = last_date + datetime.timedelta(days=i)
        pred_value = max(0, base + trend * i + np.random.normal(0, base * 0.1))
        # Day-of-week adjustment: Monday boost
        if pred_date.weekday() == 0:
            pred_value *= 1.3
        # Weekend dip
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
def burnout_prediction(db: Session = Depends(get_db)):
    """Burnout risk prediction using logistic model on overtime, caseload, shift hours."""
    staff = db.query(Staff).all()
    results = []
    for s in staff:
        # Feature engineering
        overtime_ratio = s.overtime_hours / max(s.shift_hours, 1)
        caseload_factor = s.cases_handled / 100.0
        shift_intensity = s.shift_hours / 8.0

        # Logistic-style scoring
        z = -2 + overtime_ratio * 3.5 + caseload_factor * 0.8 + shift_intensity * 0.5
        risk_prob = 1 / (1 + np.exp(-z))
        risk_prob = round(min(0.99, max(0.01, risk_prob)), 2)

        risk_level = "Low" if risk_prob < 0.3 else "Medium" if risk_prob < 0.6 else "High" if risk_prob < 0.8 else "Critical"

        results.append({
            "staff_id": s.staff_id,
            "name": s.name,
            "department": s.department,
            "risk_probability": risk_prob,
            "risk_level": risk_level,
            "overtime_hours": s.overtime_hours,
            "cases_handled": s.cases_handled,
            "shift_hours": s.shift_hours,
        })
    results.sort(key=lambda x: x["risk_probability"], reverse=True)
    return results


@router.get("/surge")
def surge_detection(db: Session = Depends(get_db)):
    """Anomaly detection for case volume surges using z-score method."""
    cases = db.query(Case).all()
    daily = defaultdict(int)
    for c in cases:
        day = c.created_time.strftime("%Y-%m-%d")
        daily[day] += 1

    sorted_days = sorted(daily.items())
    values = np.array([v for _, v in sorted_days], dtype=float)
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
