from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Case
from collections import defaultdict

router = APIRouter(prefix="/api/sla", tags=["Resolution & SLA"])


@router.get("/resolution-trend")
def resolution_trend(db: Session = Depends(get_db)):
    resolved = db.query(Case).filter(
        Case.status == "Resolved", Case.resolved_time.isnot(None)
    ).all()
    daily = defaultdict(lambda: {"count": 0, "total_time": 0})
    for c in resolved:
        day = c.resolved_time.strftime("%Y-%m-%d")
        hours = (c.resolved_time - c.created_time).total_seconds() / 3600
        daily[day]["count"] += 1
        daily[day]["total_time"] += hours
    return [
        {
            "date": day,
            "resolved_count": d["count"],
            "avg_resolution_hrs": round(d["total_time"] / d["count"], 2)
        }
        for day, d in sorted(daily.items())
    ]


@router.get("/delayed-percentage")
def delayed_percentage(db: Session = Depends(get_db)):
    resolved = db.query(Case).filter(
        Case.status == "Resolved", Case.resolved_time.isnot(None)
    ).all()
    if not resolved:
        return {"delayed_pct": 0, "on_time_pct": 100}
    delayed = sum(1 for c in resolved if c.resolved_time > c.sla_deadline)
    pct = round(delayed / len(resolved) * 100, 1)
    return {"delayed_pct": pct, "on_time_pct": round(100 - pct, 1), "total_resolved": len(resolved), "delayed_count": delayed}


@router.get("/violation-risk")
def violation_risk(db: Session = Depends(get_db)):
    """Predict SLA violation risk for currently open cases."""
    import datetime
    now = datetime.datetime(2025, 3, 31)  # simulated current time
    open_cases = db.query(Case).filter(Case.status.in_(["Open", "In Progress"])).all()
    risk_data = []
    for c in open_cases:
        time_remaining = (c.sla_deadline - now).total_seconds() / 3600
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
            "case_id": c.case_id,
            "department": c.department,
            "severity": c.severity,
            "risk_pct": risk,
            "hours_remaining": round(time_remaining, 1)
        })
    risk_data.sort(key=lambda x: x["risk_pct"], reverse=True)
    return risk_data[:50]


@router.get("/department-efficiency")
def department_efficiency(db: Session = Depends(get_db)):
    resolved = db.query(Case).filter(
        Case.status == "Resolved", Case.resolved_time.isnot(None)
    ).all()
    dept_stats = defaultdict(lambda: {"count": 0, "total_time": 0, "sla_met": 0})
    for c in resolved:
        hrs = (c.resolved_time - c.created_time).total_seconds() / 3600
        dept_stats[c.department]["count"] += 1
        dept_stats[c.department]["total_time"] += hrs
        if c.resolved_time <= c.sla_deadline:
            dept_stats[c.department]["sla_met"] += 1
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
