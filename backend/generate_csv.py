"""Generate CSV datasets for Hospital Intelligence Platform.
Creates 4 CSV files: cases.csv, staff.csv, appointments.csv, feedback.csv
Also updates the SQLite database from these CSVs.
"""
import csv
import os
import random
import datetime
import numpy as np

random.seed(42)
np.random.seed(42)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

DEPARTMENTS = ["Emergency", "ICU", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]
SEVERITIES = ["Low", "Medium", "High", "Critical"]
STATUSES = ["Open", "In Progress", "Resolved", "Escalated"]
SHIFT_OPTIONS = [6, 8, 10, 12]
BASE_DATE = datetime.datetime(2025, 1, 1)

FIRST_NAMES = [
    "Dr. Sharma", "Dr. Patel", "Dr. Gupta", "Dr. Reddy", "Dr. Kumar",
    "Dr. Singh", "Dr. Verma", "Dr. Rao", "Dr. Iyer", "Dr. Nair",
    "Dr. Joshi", "Dr. Mehta", "Dr. Bose", "Dr. Das", "Dr. Choudhary",
    "Dr. Mukherjee", "Dr. Kapoor", "Dr. Srinivasan", "Dr. Agarwal", "Dr. Menon",
    "Nurse Priya", "Nurse Anjali", "Nurse Kavitha", "Nurse Deepa", "Nurse Sunita",
    "Nurse Meena", "Nurse Lakshmi", "Nurse Rekha", "Nurse Pooja", "Nurse Divya"
]

POSITIVE_FEEDBACK = [
    "Excellent care and attentive staff.",
    "Very satisfied with the treatment received.",
    "The doctor was very thorough and professional.",
    "Quick response and great follow-up.",
    "Staff was compassionate and helpful.",
    "Clean facility and smooth process.",
    "Impressed with the level of expertise.",
    "Would highly recommend this department.",
]
NEUTRAL_FEEDBACK = [
    "Service was adequate, nothing exceptional.",
    "Wait time was a bit long but care was fine.",
    "Average experience overall.",
    "Could improve communication between shifts.",
    "Decent facilities but crowded at times.",
]
NEGATIVE_FEEDBACK = [
    "Waited too long for treatment.",
    "Staff seemed overworked and inattentive.",
    "Miscommunication about treatment plan.",
    "Felt rushed during consultation.",
    "Follow-up was poorly managed.",
    "Equipment appeared outdated in some areas.",
    "Billing errors caused unnecessary stress.",
    "Not enough staff during night shifts.",
]


def generate_staff_csv():
    """Generate staff.csv with 90+ staff members."""
    rows = []
    staff_id = 1
    for dept in DEPARTMENTS:
        num_staff = random.randint(12, 20)
        for _ in range(num_staff):
            shift = random.choice(SHIFT_OPTIONS)
            cases = random.randint(20, 200)
            avg_res = round(random.uniform(0.5, 8.0), 2)
            overtime = round(max(0, random.gauss(shift * 0.2, shift * 0.15)), 1)
            if random.random() < 0.12:
                overtime = round(random.uniform(8, 20), 1)
            name = f"{random.choice(FIRST_NAMES)}-{staff_id}"
            rows.append({
                "staff_id": staff_id, "name": name, "department": dept,
                "shift_hours": shift, "cases_handled": cases,
                "avg_resolution_time": avg_res, "overtime_hours": overtime
            })
            staff_id += 1

    filepath = os.path.join(DATA_DIR, "staff.csv")
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✔ staff.csv — {len(rows)} staff members")
    return rows


def generate_cases_csv(staff_rows):
    """Generate cases.csv with 5000 cases and realistic patterns."""
    staff_dept_map = {s["staff_id"]: s["department"] for s in staff_rows}
    staff_ids = list(staff_dept_map.keys())
    rows = []

    for i in range(5000):
        day_offset = random.randint(0, 89)
        dt = BASE_DATE + datetime.timedelta(days=day_offset)
        weekday = dt.weekday()
        hour = random.randint(6, 22) if weekday == 0 else random.randint(0, 23)

        dept_weights = [0.30, 0.15, 0.15, 0.15, 0.15, 0.10]
        dept = random.choices(DEPARTMENTS, weights=dept_weights, k=1)[0]

        if dept == "Emergency" and random.random() < 0.4:
            hour = random.choice([22, 23, 0, 1, 2, 3, 4])

        minute = random.randint(0, 59)
        created = dt.replace(hour=hour % 24, minute=minute)

        severity_weights = {
            "Emergency": [0.1, 0.25, 0.35, 0.3], "ICU": [0.05, 0.2, 0.35, 0.4],
            "Cardiology": [0.2, 0.35, 0.3, 0.15], "Orthopedics": [0.3, 0.35, 0.25, 0.1],
            "Pediatrics": [0.3, 0.4, 0.2, 0.1], "Neurology": [0.15, 0.3, 0.35, 0.2]
        }
        severity = random.choices(SEVERITIES, weights=severity_weights[dept], k=1)[0]

        sla_hours = {"Low": 24, "Medium": 12, "High": 6, "Critical": 2}
        sla_deadline = created + datetime.timedelta(hours=sla_hours[severity])

        dept_staff = [sid for sid, d in staff_dept_map.items() if d == dept]
        staff_id = random.choice(dept_staff) if dept_staff else random.choice(staff_ids)

        resolved_time = ""
        if random.random() < 0.65:
            status = "Resolved"
            res_hours = random.uniform(0.5, sla_hours[severity] * 1.5)
            if random.random() < 0.15:
                res_hours = sla_hours[severity] + random.uniform(1, 10)
            resolved_time = (created + datetime.timedelta(hours=res_hours)).strftime("%Y-%m-%d %H:%M:%S")
        elif random.random() < 0.5:
            status = "In Progress"
        elif random.random() < 0.6:
            status = "Open"
        else:
            status = "Escalated"

        rows.append({
            "case_id": i + 1, "department": dept, "severity": severity,
            "created_time": created.strftime("%Y-%m-%d %H:%M:%S"),
            "resolved_time": resolved_time, "status": status,
            "staff_id": staff_id,
            "sla_deadline": sla_deadline.strftime("%Y-%m-%d %H:%M:%S"),
        })

    filepath = os.path.join(DATA_DIR, "cases.csv")
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✔ cases.csv — {len(rows)} cases")


def generate_appointments_csv():
    """Generate appointments.csv with 1500 appointments."""
    rows = []
    for i in range(1500):
        day_offset = random.randint(0, 89)
        dt = BASE_DATE + datetime.timedelta(days=day_offset)
        hour = random.choice([8, 9, 10, 11, 13, 14, 15, 16, 17])
        minute = random.choice([0, 15, 30, 45])
        slot = dt.replace(hour=hour, minute=minute)
        dept = random.choice(DEPARTMENTS)
        attended = random.random() > 0.18
        rows.append({
            "appointment_id": i + 1, "department": dept,
            "slot_time": slot.strftime("%Y-%m-%d %H:%M:%S"),
            "attended_flag": attended,
        })

    filepath = os.path.join(DATA_DIR, "appointments.csv")
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✔ appointments.csv — {len(rows)} appointments")


def generate_feedback_csv():
    """Generate feedback.csv with 800 feedback entries."""
    rows = []
    for i in range(800):
        dept = random.choice(DEPARTMENTS)
        r = random.random()
        if r < 0.5:
            text = random.choice(POSITIVE_FEEDBACK)
            rating = random.choice([4, 5])
            sentiment = round(random.uniform(0.3, 1.0), 2)
        elif r < 0.8:
            text = random.choice(NEUTRAL_FEEDBACK)
            rating = 3
            sentiment = round(random.uniform(-0.1, 0.3), 2)
        else:
            text = random.choice(NEGATIVE_FEEDBACK)
            rating = random.choice([1, 2])
            sentiment = round(random.uniform(-1.0, -0.1), 2)
        rows.append({
            "feedback_id": i + 1, "department": dept,
            "feedback_text": text, "rating": rating,
            "sentiment_score": sentiment,
        })

    filepath = os.path.join(DATA_DIR, "feedback.csv")
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✔ feedback.csv — {len(rows)} feedback entries")


if __name__ == "__main__":
    print("🏥 Generating Hospital CSV Datasets...")
    print(f"   Output directory: {DATA_DIR}\n")
    staff = generate_staff_csv()
    generate_cases_csv(staff)
    generate_appointments_csv()
    generate_feedback_csv()
    print(f"\n✅ All CSV files generated in: {DATA_DIR}")
    print("   - staff.csv")
    print("   - cases.csv")
    print("   - appointments.csv")
    print("   - feedback.csv")
