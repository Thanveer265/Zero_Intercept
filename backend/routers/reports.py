from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Case, Staff, Appointment, Feedback
from collections import defaultdict
import csv
import io
import datetime

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/generate")
def generate_report(db: Session = Depends(get_db)):
    """Generate weekly report data."""
    total_cases = db.query(func.count(Case.case_id)).scalar()
    resolved = db.query(Case).filter(Case.status == "Resolved", Case.resolved_time.isnot(None)).all()
    active = db.query(func.count(Case.case_id)).filter(Case.status.in_(["Open", "In Progress"])).scalar()
    sla_met = sum(1 for c in resolved if c.resolved_time <= c.sla_deadline)
    avg_res = sum((c.resolved_time - c.created_time).total_seconds() / 3600 for c in resolved) / len(resolved) if resolved else 0

    dept_summary = defaultdict(lambda: {"total": 0, "resolved": 0, "active": 0})
    all_cases = db.query(Case).all()
    for c in all_cases:
        dept_summary[c.department]["total"] += 1
        if c.status == "Resolved":
            dept_summary[c.department]["resolved"] += 1
        elif c.status in ["Open", "In Progress"]:
            dept_summary[c.department]["active"] += 1

    staff_count = db.query(func.count(Staff.staff_id)).scalar()
    avg_overtime = db.query(func.avg(Staff.overtime_hours)).scalar() or 0
    feedback_avg = db.query(func.avg(Feedback.rating)).scalar() or 0

    return {
        "report_title": "Weekly Operational Intelligence Report",
        "generated_at": datetime.datetime.now().isoformat(),
        "period": "Last 7 Days",
        "summary": {
            "total_cases": total_cases,
            "resolved_cases": len(resolved),
            "active_cases": active,
            "sla_compliance_pct": round(sla_met / len(resolved) * 100, 1) if resolved else 0,
            "avg_resolution_hrs": round(avg_res, 2),
            "total_staff": staff_count,
            "avg_overtime_hrs": round(avg_overtime, 1),
            "patient_satisfaction": round(feedback_avg, 1),
        },
        "department_breakdown": [
            {"department": d, **s} for d, s in sorted(dept_summary.items())
        ],
    }


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)):
    """Export cases data as CSV."""
    cases = db.query(Case).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["case_id", "department", "severity", "created_time", "resolved_time", "status", "staff_id", "sla_deadline"])
    for c in cases:
        writer.writerow([c.case_id, c.department, c.severity, c.created_time, c.resolved_time, c.status, c.staff_id, c.sla_deadline])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=hospital_cases.csv"}
    )


@router.get("/export/pdf")
def export_pdf(db: Session = Depends(get_db)):
    """Export report as PDF."""
    from fpdf import FPDF

    report = generate_report(db)
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, report["report_title"], ln=True, align="C")
    pdf.set_font("Arial", "", 10)
    pdf.cell(0, 8, f"Generated: {report['generated_at']}", ln=True, align="C")
    pdf.ln(10)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.set_font("Arial", "", 10)
    for key, val in report["summary"].items():
        label = key.replace("_", " ").title()
        pdf.cell(0, 7, f"{label}: {val}", ln=True)

    pdf.ln(5)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 8, "Department Breakdown", ln=True)
    pdf.set_font("Arial", "B", 10)
    pdf.cell(60, 7, "Department", 1)
    pdf.cell(30, 7, "Total", 1)
    pdf.cell(30, 7, "Resolved", 1)
    pdf.cell(30, 7, "Active", 1)
    pdf.ln()
    pdf.set_font("Arial", "", 10)
    for d in report["department_breakdown"]:
        pdf.cell(60, 7, d["department"], 1)
        pdf.cell(30, 7, str(d["total"]), 1)
        pdf.cell(30, 7, str(d["resolved"]), 1)
        pdf.cell(30, 7, str(d["active"]), 1)
        pdf.ln()

    output = io.BytesIO()
    pdf.output(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=hospital_report.pdf"}
    )
