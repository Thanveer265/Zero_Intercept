from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models import Case, Staff

router = APIRouter(prefix="/api/workload", tags=["Workload Analytics"])


@router.get("/department")
def department_workload(db: Session = Depends(get_db)):
    results = db.query(
        Case.department,
        func.count(Case.case_id).label("total_cases"),
        func.sum(func.iif(Case.status != "Resolved", 1, 0)).label("active_cases"),
    ).group_by(Case.department).all()

    return [
        {"department": r[0], "total_cases": r[1], "active_cases": r[2]}
        for r in results
    ]


@router.get("/staff")
def staff_workload(db: Session = Depends(get_db)):
    results = db.query(Staff).order_by(Staff.cases_handled.desc()).limit(20).all()
    return [
        {
            "staff_id": s.staff_id,
            "name": s.name,
            "department": s.department,
            "cases_handled": s.cases_handled,
            "shift_hours": s.shift_hours,
            "overtime_hours": s.overtime_hours,
            "avg_resolution_time": s.avg_resolution_time,
        }
        for s in results
    ]


@router.get("/hourly-heatmap")
def hourly_heatmap(db: Session = Depends(get_db)):
    cases = db.query(Case).all()
    heatmap = [[0] * 24 for _ in range(7)]
    for c in cases:
        dow = c.created_time.weekday()
        hour = c.created_time.hour
        heatmap[dow][hour] += 1
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    return {"days": days, "hours": list(range(24)), "data": heatmap}


@router.get("/weekly-trend")
def weekly_trend(db: Session = Depends(get_db)):
    cases = db.query(Case).all()
    from collections import defaultdict
    weekly = defaultdict(int)
    for c in cases:
        week = c.created_time.isocalendar()[1]
        year = c.created_time.year
        weekly[f"{year}-W{week:02d}"] += 1
    sorted_weeks = sorted(weekly.items())
    return [{"week": w, "cases": cnt} for w, cnt in sorted_weeks]
