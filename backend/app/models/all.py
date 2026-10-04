from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    timezone = Column(String, default="Asia/Karachi")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lms_connections = relationship("LMSConnection", back_populates="user", cascade="all, delete-orphan")
    courses = relationship("Course", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    drafts = relationship("Draft", back_populates="user", cascade="all, delete-orphan")
    agent_traces = relationship("AgentTrace", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class LMSConnection(Base):
    __tablename__ = "lms_connections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider = Column(String, nullable=False)  # "demo", "google_classroom", "moodle"
    status = Column(String, default="connected")  # "connected", "disconnected", "error"
    token_reference = Column(String, nullable=True)
    connected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_sync = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="lms_connections")


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lms_course_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    instructor = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    semester = Column(String, default="Semester 5")  # e.g. "Semester 5", "Semester 4", etc.
    is_current = Column(Boolean, default=True)  # True if currently enrolled semester

    user = relationship("User", back_populates="courses")
    assignments = relationship("Assignment", back_populates="course", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="course", cascade="all, delete-orphan")
    announcements = relationship("Announcement", back_populates="course", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="course", cascade="all, delete-orphan")


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    external_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    task_instructions = Column(Text, nullable=True)  # Full teacher-uploaded problem statement & tasks
    due_at = Column(DateTime, nullable=True)
    weight = Column(Float, nullable=True)
    status = Column(String, default="pending")  # "pending", "in_progress", "submitted", "graded"
    estimated_minutes = Column(Integer, nullable=True)
    rubric_json = Column(Text, nullable=True)  # JSON string
    requirements_json = Column(Text, nullable=True)  # JSON string of extracted requirements
    confirmed = Column(Boolean, default=False)

    course = relationship("Course", back_populates="assignments")
    deadlines = relationship("Deadline", back_populates="assignment", cascade="all, delete-orphan")
    drafts = relationship("Draft", back_populates="assignment", cascade="all, delete-orphan")


class Material(Base):
    __tablename__ = "materials"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    external_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "pdf", "slides", "video", "link", "html"
    source_url = Column(String, nullable=True)
    content_text = Column(Text, nullable=True)  # Extracted text content for RAG
    content_hash = Column(String, nullable=True)
    indexed_at = Column(DateTime, nullable=True)

    course = relationship("Course", back_populates="materials")


class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    external_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    posted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="announcements")


class Deadline(Base):
    __tablename__ = "deadlines"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    deadline = Column(DateTime, nullable=False)
    confirmed_by_user = Column(Boolean, default=False)

    assignment = relationship("Assignment", back_populates="deadlines")


class StudyPlan(Base):
    __tablename__ = "study_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    plan_json = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=True)
    conflicts_json = Column(Text, nullable=True)
    warnings_json = Column(Text, nullable=True)

    user = relationship("User", back_populates="study_plans")


class Draft(Base):
    __tablename__ = "drafts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    filename = Column(String, nullable=False)
    storage_reference = Column(String, nullable=True)
    content_text = Column(Text, nullable=True)
    ownership_confirmed = Column(Boolean, default=False)
    status = Column(String, default="draft")  # "draft", "staged_unsubmitted", "submitted"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="drafts")
    assignment = relationship("Assignment", back_populates="drafts")
    reviews = relationship("Review", back_populates="draft", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    draft_id = Column(Integer, ForeignKey("drafts.id"), nullable=False)
    feedback_json = Column(Text, nullable=False)
    estimated_range = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    draft = relationship("Draft", back_populates="reviews")


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    quiz_date = Column(DateTime, nullable=True)
    questions_json = Column(Text, nullable=True)
    results_json = Column(Text, nullable=True)

    course = relationship("Course", back_populates="quizzes")


class AgentTrace(Base):
    __tablename__ = "agent_traces"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent = Column(String, nullable=False)
    action = Column(String, nullable=False)
    status = Column(String, nullable=False)  # "success", "error", "blocked"
    duration_ms = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    safe_summary = Column(Text, nullable=False)
    input_preview = Column(Text, nullable=True)
    output_preview = Column(Text, nullable=True)

    user = relationship("User", back_populates="agent_traces")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, default="info")  # "deadline", "portal", "system", "agent", "quiz"
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")
