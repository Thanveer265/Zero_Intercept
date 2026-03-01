import requests
import time

BASE_URL = "http://127.0.0.1:8000/api"

def run_simulation():
    print("🚀 Starting Zero Intercept Full Workflow Simulation...")

    # 1. Patient Books Appointments
    print("\n--- 1. Booking Appointments ---")
    bookings = []
    for i in range(3):
        res = requests.post(f"{BASE_URL}/patient/bookings", json={
            "patient_email": "patient@example.com",
            "patient_name": "Test Patient",
            "department": "Emergency",
            "doctor_name": "Dr. Sarah Taylor",
            "preferred_date": "2026-03-05",
            "preferred_time": "10:00 AM",
            "reason": f"Simulation Test {i+1}"
        })
        if res.status_code == 200:
            booking_id = res.json()["id"]
            bookings.append(booking_id)
            print(f"✅ Booked appointment {booking_id}")
        else:
            print(f"❌ Failed to book: {res.text}")

    # 2. Doctor Approves Appointments (SLA)
    print("\n--- 2. Doctor Approves Appointments ---")
    for b_id in bookings:
        res = requests.put(f"{BASE_URL}/doctor/bookings/{b_id}", json={
            "action": "approve",
            "reason": "Approved via simulation"
        })
        if res.status_code == 200:
            print(f"✅ Approved appointment {b_id}")
        else:
            print(f"❌ Failed to approve: {res.text}")

    # 3. Doctor Writes Prescriptions (Burnout Risk -> needs > 5)
    print("\n--- 3. Doctor Writing Prescriptions ---")
    for i in range(6):
        res = requests.post(f"{BASE_URL}/doctor/prescriptions", json={
            "patient_email": "patient@example.com",
            "patient_name": "Test Patient",
            "medication": f"SimMeds {i+1}",
            "dosage": "100mg",
            "frequency": "Daily",
            "duration": "7 days",
            "notes": "Simulation",
            "doctor_name": "Dr. Sarah Taylor",
            "doctor_department": "Emergency"
        })
        if res.status_code == 200:
            print(f"✅ Prescribed med {i+1}")
        else:
            print(f"❌ Failed to prescribe: {res.text}")

    # 4. Doctor Assigns Ward
    print("\n--- 4. Assigning Ward ---")
    res = requests.post(f"{BASE_URL}/ward/ward-admission", json={
        "patient_name": "Test Patient",
        "patient_email": "patient@example.com",
        "ward_type": "ICU",
        "department": "Emergency",
        "assigned_by_doctor": "Dr. Sarah Taylor",
        "notes": "Urgent Care required"
    })
    admission_id = None
    if res.status_code == 200:
        admission_id = res.json()["id"]
        print(f"✅ Assigned to ward, admission ID: {admission_id}")
    else:
        print(f"❌ Failed to assign ward: {res.text}")

    if admission_id:
        # 5. Nurse Admits
        print("\n--- 5. Nurse Admitting Patient ---")
        res = requests.put(f"{BASE_URL}/ward/admit/{admission_id}?nurse_email=nurse@example.com")
        if res.status_code == 200:
            print(f"✅ Patient admitted")
        else:
            print(f"❌ Failed to admit: {res.text}")

        # Wait to simulate resolution time
        print("⏳ Waiting 3 seconds to simulate stay...")
        time.sleep(3)

        # 6. Nurse Discharges
        print("\n--- 6. Nurse Discharging Patient ---")
        res = requests.put(f"{BASE_URL}/ward/discharge/{admission_id}")
        if res.status_code == 200:
            print(f"✅ Patient discharged")
        else:
            print(f"❌ Failed to discharge: {res.text}")

    print("\n--- 7. Assigning & Admitting Another Patient (Active) ---")
    res = requests.post(f"{BASE_URL}/ward/ward-admission", json={
        "patient_name": "Active Patient",
        "patient_email": "active@example.com",
        "ward_type": "General",
        "department": "Emergency",
        "assigned_by_doctor": "Dr. Sarah Taylor",
        "notes": "Observation"
    })
    if res.status_code == 200:
        active_id = res.json()["id"]
        res = requests.put(f"{BASE_URL}/ward/admit/{active_id}?nurse_email=nurse@example.com")
        if res.status_code == 200:
            print("✅ Second patient admitted (left active)")

    print("\n🎉 Simulation complete! Check the Admin Dashboard to see the new metrics.")

if __name__ == "__main__":
    run_simulation()
