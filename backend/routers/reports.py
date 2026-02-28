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
    """Export report as styled PDF using ReportLab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm, inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

    report = generate_report(db)
    output = io.BytesIO()
    
    # Create document
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=20*mm,
        bottomMargin=20*mm
    )
    
    # Colors
    primary_dark = colors.HexColor('#0f172a')
    primary_blue = colors.HexColor('#3b82f6')
    success_green = colors.HexColor('#22c55e')
    success_bg = colors.HexColor('#f0fdf4')
    warning_orange = colors.HexColor('#f59e0b')
    warning_bg = colors.HexColor('#fffbeb')
    danger_red = colors.HexColor('#ef4444')
    danger_bg = colors.HexColor('#fef2f2')
    info_bg = colors.HexColor('#eff6ff')
    gray_light = colors.HexColor('#f8fafc')
    gray_border = colors.HexColor('#e2e8f0')
    gray_text = colors.HexColor('#64748b')
    purple = colors.HexColor('#a855f7')
    purple_bg = colors.HexColor('#faf5ff')
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=22,
        textColor=colors.white,
        spaceAfter=5,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#94a3b8'),
        spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=primary_dark,
        spaceBefore=20,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=primary_dark
    )
    
    # Build content
    story = []
    
    # Header section (as table with background)
    generated_at = datetime.datetime.fromisoformat(report["generated_at"]).strftime("%B %d, %Y at %I:%M %p")
    
    header_data = [[
        Paragraph(f"<font color='white'><b>{report['report_title']}</b></font>", title_style),
    ], [
        Paragraph("<font color='#94a3b8'>AI-Driven Hospital Operational Intelligence Platform</font>", subtitle_style),
    ], [
        Paragraph(f"<font color='#93c5fd'>📅 Period: {report['period']}  |  🕐 Generated: {generated_at}</font>", 
                  ParagraphStyle('Meta', fontSize=9, textColor=colors.HexColor('#93c5fd')))
    ]]
    
    header_table = Table(header_data, colWidths=[170*mm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), primary_dark),
        ('TOPPADDING', (0, 0), (-1, 0), 25),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 20),
        ('LEFTPADDING', (0, 0), (-1, -1), 25),
        ('RIGHTPADDING', (0, 0), (-1, -1), 25),
        ('LINEBELOW', (0, -1), (-1, -1), 4, primary_blue),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))
    
    # Executive Summary Section
    story.append(Paragraph("📊 EXECUTIVE SUMMARY", section_style))
    
    # KPI Cards
    summary = report["summary"]
    
    def get_kpi_color(value, metric):
        if metric == "sla":
            if value >= 80: return success_green, success_bg
            elif value >= 60: return warning_orange, warning_bg
            else: return danger_red, danger_bg
        elif metric == "active":
            if value > 500: return warning_orange, warning_bg
            return primary_blue, info_bg
        return primary_blue, info_bg
    
    sla_color, sla_bg = get_kpi_color(summary["sla_compliance_pct"], "sla")
    active_color, active_bg = get_kpi_color(summary["active_cases"], "active")
    
    kpi_label_style = ParagraphStyle('KPILabel', alignment=TA_CENTER, fontSize=9, textColor=gray_text)
    kpi_value_style = ParagraphStyle('KPIValue', alignment=TA_CENTER, fontSize=20, fontName='Helvetica-Bold')
    
    # KPI Labels row
    kpi_labels = [
        Paragraph("TOTAL CASES", kpi_label_style),
        Paragraph("RESOLVED", kpi_label_style),
        Paragraph("ACTIVE", kpi_label_style),
        Paragraph("SLA COMPLIANCE", kpi_label_style),
    ]
    
    # KPI Values row
    sla_val_color = '#16a34a' if summary['sla_compliance_pct'] >= 80 else '#d97706' if summary['sla_compliance_pct'] >= 60 else '#dc2626'
    kpi_values = [
        Paragraph(f"<font color='#2563eb'>{summary['total_cases']}</font>", kpi_value_style),
        Paragraph(f"<font color='#16a34a'>{summary['resolved_cases']}</font>", kpi_value_style),
        Paragraph(f"<font color='#d97706'>{summary['active_cases']}</font>", kpi_value_style),
        Paragraph(f"<font color='{sla_val_color}'>{summary['sla_compliance_pct']}%</font>", kpi_value_style),
    ]
    
    kpi_data = [kpi_labels, kpi_values]
    
    kpi_table = Table(kpi_data, colWidths=[40*mm, 40*mm, 40*mm, 40*mm], spaceBefore=0, spaceAfter=0)
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), info_bg),
        ('BACKGROUND', (1, 0), (1, -1), success_bg),
        ('BACKGROUND', (2, 0), (2, -1), warning_bg),
        ('BACKGROUND', (3, 0), (3, -1), success_bg if summary['sla_compliance_pct'] >= 80 else warning_bg if summary['sla_compliance_pct'] >= 60 else danger_bg),
        ('BOX', (0, 0), (0, -1), 2, primary_blue),
        ('BOX', (1, 0), (1, -1), 2, success_green),
        ('BOX', (2, 0), (2, -1), 2, warning_orange),
        ('BOX', (3, 0), (3, -1), 2, success_green if summary['sla_compliance_pct'] >= 80 else warning_orange if summary['sla_compliance_pct'] >= 60 else danger_red),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
        ('TOPPADDING', (0, 1), (-1, 1), 0),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 15))
    
    # Two column info section
    metrics_data = [
        ["Average Resolution Time", f"{summary['avg_resolution_hrs']}h"],
        ["Total Staff Members", str(summary['total_staff'])],
        ["Average Overtime Hours", f"{summary['avg_overtime_hrs']}h"],
        ["Patient Satisfaction", f"{summary['patient_satisfaction']}/5.0"],
    ]
    
    # Insights
    insights = []
    if summary['sla_compliance_pct'] >= 80:
        insights.append("✓ Excellent SLA compliance rate achieved")
    else:
        insights.append("⚠ SLA compliance requires improvement")
    
    if summary['avg_overtime_hrs'] > 5:
        insights.append("⚠ Staff overtime is elevated")
    else:
        insights.append("✓ Staff workload within healthy range")
    
    if summary['patient_satisfaction'] >= 4:
        insights.append("✓ Patient satisfaction is excellent")
    else:
        insights.append("⚠ Focus on improving patient experience")
    
    resolution_rate = round((summary['resolved_cases'] / summary['total_cases']) * 100, 1) if summary['total_cases'] > 0 else 0
    insights.append(f"📊 Resolution rate: {resolution_rate}%")
    
    # Performance metrics table
    perf_header = [[Paragraph("<font color='white'><b>📊 PERFORMANCE METRICS</b></font>", 
                              ParagraphStyle('Header', fontSize=10, textColor=colors.white))]]
    perf_rows = [[Paragraph(f"<font color='#64748b'>{m[0]}</font>", normal_style),
                  Paragraph(f"<font color='#0f172a'><b>{m[1]}</b></font>", 
                           ParagraphStyle('Val', alignment=TA_RIGHT, fontSize=11, fontName='Helvetica-Bold'))] 
                 for m in metrics_data]
    
    perf_table = Table(perf_header + perf_rows, colWidths=[55*mm, 25*mm])
    perf_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#166534')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, gray_border),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('BOX', (0, 0), (-1, -1), 1, gray_border),
    ]))
    
    # Insights table
    insights_header = [[Paragraph("<font color='white'><b>💡 KEY INSIGHTS</b></font>", 
                                  ParagraphStyle('Header', fontSize=10, textColor=colors.white))]]
    insights_rows = [[Paragraph(f"<font color='#581c87'>{insight}</font>", 
                                ParagraphStyle('Insight', fontSize=9, textColor=colors.HexColor('#581c87')))] 
                     for insight in insights]
    
    insights_table = Table(insights_header + insights_rows, colWidths=[80*mm])
    insights_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#581c87')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (0, 1), (-1, -1), purple_bg),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LINEBELOW', (0, 1), (-1, -2), 0.5, colors.HexColor('#e9d5ff')),
        ('BOX', (0, 0), (-1, -1), 1, gray_border),
    ]))
    
    # Side by side layout
    info_data = [[perf_table, insights_table]]
    info_container = Table(info_data, colWidths=[85*mm, 85*mm])
    info_container.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(info_container)
    story.append(Spacer(1, 20))
    
    # Department Breakdown Section
    story.append(Paragraph("🏥 DEPARTMENT BREAKDOWN", section_style))
    
    # Department table
    dept_header = [
        Paragraph("<font color='white'><b>DEPARTMENT</b></font>", ParagraphStyle('TH', fontSize=8, textColor=colors.white)),
        Paragraph("<font color='white'><b>TOTAL</b></font>", ParagraphStyle('TH', fontSize=8, textColor=colors.white, alignment=TA_RIGHT)),
        Paragraph("<font color='white'><b>RESOLVED</b></font>", ParagraphStyle('TH', fontSize=8, textColor=colors.white, alignment=TA_RIGHT)),
        Paragraph("<font color='white'><b>ACTIVE</b></font>", ParagraphStyle('TH', fontSize=8, textColor=colors.white, alignment=TA_RIGHT)),
        Paragraph("<font color='white'><b>RATE</b></font>", ParagraphStyle('TH', fontSize=8, textColor=colors.white, alignment=TA_RIGHT)),
    ]
    
    dept_rows = [dept_header]
    for i, dept in enumerate(report["department_breakdown"]):
        rate = round((dept['resolved'] / dept['total']) * 100, 1) if dept['total'] > 0 else 0
        rate_color = '#166534' if rate >= 70 else '#92400e' if rate >= 50 else '#991b1b'
        rate_bg = '#dcfce7' if rate >= 70 else '#fef3c7' if rate >= 50 else '#fecaca'
        
        row = [
            Paragraph(f"<font color='#0f172a'><b>{dept['department']}</b></font>", normal_style),
            Paragraph(f"<font color='#0f172a'>{dept['total']}</font>", ParagraphStyle('TD', alignment=TA_RIGHT)),
            Paragraph(f"<font color='#0f172a'>{dept['resolved']}</font>", ParagraphStyle('TD', alignment=TA_RIGHT)),
            Paragraph(f"<font color='#0f172a'>{dept['active']}</font>", ParagraphStyle('TD', alignment=TA_RIGHT)),
            Paragraph(f"<font color='{rate_color}'><b>{rate}%</b></font>", ParagraphStyle('TD', alignment=TA_RIGHT)),
        ]
        dept_rows.append(row)
    
    dept_table = Table(dept_rows, colWidths=[50*mm, 30*mm, 30*mm, 30*mm, 30*mm])
    
    table_style = [
        ('BACKGROUND', (0, 0), (-1, 0), primary_dark),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, gray_border),
        ('BOX', (0, 0), (-1, -1), 1, gray_border),
    ]
    
    # Alternating row colors
    for i in range(1, len(dept_rows)):
        if i % 2 == 0:
            table_style.append(('BACKGROUND', (0, i), (-1, i), gray_light))
    
    dept_table.setStyle(TableStyle(table_style))
    story.append(dept_table)
    story.append(Spacer(1, 30))
    
    # Footer
    footer_data = [[
        Paragraph("<font color='#0f172a' size='12'><b>🏥 HOSPITAL INTELLIGENCE PLATFORM</b></font>", 
                  ParagraphStyle('Footer', alignment=TA_CENTER, fontSize=12, fontName='Helvetica-Bold')),
    ], [
        Paragraph("<font color='#64748b' size='9'>AI-Driven Operational Intelligence System</font>", 
                  ParagraphStyle('FooterSub', alignment=TA_CENTER, fontSize=9)),
    ], [
        Paragraph("<font color='#94a3b8' size='7'>CONFIDENTIAL • ZERO INTERCEPT • 2026</font>", 
                  ParagraphStyle('FooterMeta', alignment=TA_CENTER, fontSize=7)),
    ]]
    
    footer_table = Table(footer_data, colWidths=[170*mm])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), gray_light),
        ('LINEABOVE', (0, 0), (-1, 0), 3, primary_blue),
        ('TOPPADDING', (0, 0), (-1, 0), 15),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 15),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(footer_table)
    
    # Build PDF
    doc.build(story)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=hospital_report.pdf"}
    )
