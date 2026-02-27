"""Synthetic data seeder for Hospital Intelligence Platform.
Loads data from CSV files in backend/data/ directory.
If CSVs don't exist, generates them first using generate_csv.py.
"""
import csv
import os
import datetime
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
from models import Case, Staff, Appointment, Feedback

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _parse_dt(s):
    """Parse datetime string, return None if empty."""
    if not s:
        return None
    return datetime.datetime.strptime(s, "%Y-%m-%d %H:%M:%S")


def load_staff(db: Session):
    filepath = os.path.join(DATA_DIR, "staff.csv")
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        staff_list = []
        for row in reader:
            s = Staff(
                staff_id=int(row["staff_id"]), name=row["name"],
                department=row["department"], shift_hours=int(row["shift_hours"]),
                cases_handled=int(row["cases_handled"]),
                avg_resolution_time=float(row["avg_resolution_time"]),
                overtime_hours=float(row["overtime_hours"]),
            )
            staff_list.append(s)
        db.add_all(staff_list)
        db.commit()
    print(f"  Loaded {len(staff_list)} staff from CSV")


def load_cases(db: Session):
    filepath = os.path.join(DATA_DIR, "cases.csv")
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        cases = []
        for row in reader:
            c = Case(
                case_id=int(row["case_id"]), department=row["department"],
                severity=row["severity"],
                created_time=_parse_dt(row["created_time"]),
                resolved_time=_parse_dt(row["resolved_time"]),
                status=row["status"], staff_id=int(row["staff_id"]),
                sla_deadline=_parse_dt(row["sla_deadline"]),
            )
            cases.append(c)
        db.add_all(cases)
        db.commit()
    print(f"  Loaded {len(cases)} cases from CSV")


def load_appointments(db: Session):
    filepath = os.path.join(DATA_DIR, "appointments.csv")
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        appts = []
        for row in reader:
            a = Appointment(
                appointment_id=int(row["appointment_id"]),
                department=row["department"],
                slot_time=_parse_dt(row["slot_time"]),
                attended_flag=row["attended_flag"] == "True",
            )
            appts.append(a)
        db.add_all(appts)
        db.commit()
    print(f"  Loaded {len(appts)} appointments from CSV")


def load_feedback(db: Session):
    filepath = os.path.join(DATA_DIR, "feedback.csv")
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fbs = []
        for row in reader:
            fb = Feedback(
                feedback_id=int(row["feedback_id"]),
                department=row["department"],
                feedback_text=row["feedback_text"],
                rating=int(row["rating"]),
                sentiment_score=float(row["sentiment_score"]),
            )
            fbs.append(fb)
        db.add_all(fbs)
        db.commit()
    print(f"  Loaded {len(fbs)} feedback entries from CSV")


def seed():
    """Seed database from CSV files. Generate CSVs first if they don't exist."""
    # Generate CSVs if they don't exist
    if not os.path.exists(os.path.join(DATA_DIR, "staff.csv")):
        print("CSV files not found. Generating datasets...")
        from generate_csv import (
            generate_staff_csv, generate_cases_csv,
            generate_appointments_csv, generate_feedback_csv
        )
        staff = generate_staff_csv()
        generate_cases_csv(staff)
        generate_appointments_csv()
        generate_feedback_csv()
        print()

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Loading data from CSV files...")
        load_staff(db)
        load_cases(db)
        load_appointments(db)
        load_feedback(db)
        print("Database seeded successfully from CSVs!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
