from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from database import Base


class Case(Base):
    __tablename__ = "cases"
    case_id = Column(Integer, primary_key=True, index=True)
    department = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # Low, Medium, High, Critical
    created_time = Column(DateTime, nullable=False)
    resolved_time = Column(DateTime, nullable=True)
    status = Column(String, nullable=False)  # Open, In Progress, Resolved, Escalated
    staff_id = Column(Integer, nullable=False)
    sla_deadline = Column(DateTime, nullable=False)


class Staff(Base):
    __tablename__ = "staff"
    staff_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department = Column(String, nullable=False)
    shift_hours = Column(Float, nullable=False)
    cases_handled = Column(Integer, nullable=False)
    avg_resolution_time = Column(Float, nullable=False)  # in hours
    overtime_hours = Column(Float, nullable=False)


class Appointment(Base):
    __tablename__ = "appointments"
    appointment_id = Column(Integer, primary_key=True, index=True)
    department = Column(String, nullable=False)
    slot_time = Column(DateTime, nullable=False)
    attended_flag = Column(Boolean, nullable=False)


class Feedback(Base):
    __tablename__ = "feedback"
    feedback_id = Column(Integer, primary_key=True, index=True)
    department = Column(String, nullable=False)
    feedback_text = Column(String, nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    sentiment_score = Column(Float, nullable=False)  # -1.0 to 1.0
