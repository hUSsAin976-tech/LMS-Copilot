"""
LMS API Routes — connect, sync, disconnect.
Sync pulls data from the LMS connector into the local DB.
"""
import json
from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.all import (
    User, LMSConnection, Course, Assignment, Material,
    Announcement, Quiz, Deadline, AgentTrace,
)
from app.integrations.lms.ams_portal import ams_portal_connector, _portal_state
from app.rag.service import rag_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/lms", tags=["LMS"])


def _parse_dt(val: Any) -> Optional[datetime]:
    if not val:
        return None
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return None


@router.post("/connect")
def connect_lms(provider: str = "ams_portal", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    connector = ams_portal_connector
    connector.connect()

    # Store connection record
    conn = db.query(LMSConnection).filter(
        LMSConnection.user_id == user.id,
    ).first()
    if not conn:
        conn = LMSConnection(user_id=user.id, provider=provider, status="connected")
        db.add(conn)
    else:
        conn.status = "connected"
        conn.connected_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "connected", "provider": provider, "user_id": user.id}


@router.post("/sync")
def sync_lms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    connector = ams_portal_connector
    start = datetime.now(timezone.utc)

    # --- Sync courses ---
    courses_created = 0
    for c_data in connector.get_courses():
        course = db.query(Course).filter(
            Course.lms_course_id == c_data["id"],
            Course.user_id == user.id,
        ).first()
        if not course:
            raw_instructor = c_data.get("instructor")
            if isinstance(raw_instructor, dict):
                raw_instructor = raw_instructor.get("name") or raw_instructor.get("fullName") or str(raw_instructor)
            elif not isinstance(raw_instructor, str):
                raw_instructor = str(raw_instructor) if raw_instructor else None

            raw_description = c_data.get("description")
            if isinstance(raw_description, dict):
                raw_description = raw_description.get("text") or str(raw_description)
            elif not isinstance(raw_description, str):
                raw_description = str(raw_description) if raw_description else None

            course = Course(
                user_id=user.id,
                lms_course_id=c_data["id"],
                name=c_data["name"],
                code=c_data["code"],
                instructor=raw_instructor,
                description=raw_description,
            )
            db.add(course)
            db.flush()
            courses_created += 1

        # --- Assignments ---
        for a_data in connector.get_assignments(c_data["id"]):
            existing = db.query(Assignment).filter(
                Assignment.external_id == a_data["id"],
                Assignment.course_id == course.id,
            ).first()
            if not existing:
                due = _parse_dt(a_data.get("due_at"))
                a = Assignment(
                    course_id=course.id,
                    external_id=a_data["id"],
                    title=a_data["title"],
                    description=a_data.get("description"),
                    due_at=due,
                    weight=a_data.get("weight"),
                    estimated_minutes=a_data.get("estimated_minutes"),
                    rubric_json=json.dumps(a_data.get("rubric", [])),
                    status=a_data.get("status", "pending"),
                )
                db.add(a)
                db.flush()
                if due:
                    db.add(Deadline(assignment_id=a.id, deadline=due))

        # --- Materials ---
        for m_data in connector.get_materials(c_data["id"]):
            existing = db.query(Material).filter(
                Material.external_id == m_data["id"],
                Material.course_id == course.id,
            ).first()
            if not existing:
                existing = Material(
                    course_id=course.id,
                    external_id=m_data["id"],
                    title=m_data["title"],
                    type=m_data.get("type", "pdf"),
                    source_url=m_data.get("source_url"),
                    content_text=m_data.get("content_text"),
                )
                db.add(existing)
                db.flush()

            # Ingest into RAG vector index
            try:
                rag_service.ingest_document(
                    material_id=str(existing.id or m_data["id"]),
                    course_id=str(course.id),
                    user_id=user.id,
                    title=existing.title,
                    text=existing.content_text or existing.title,
                )
            except Exception as e:
                pass

        # --- Announcements ---
        for ann_data in connector.get_announcements(c_data["id"]):
            existing = db.query(Announcement).filter(
                Announcement.external_id == ann_data["id"],
                Announcement.course_id == course.id,
            ).first()
            if not existing:
                posted = _parse_dt(ann_data.get("posted_at"))
                db.add(Announcement(
                    course_id=course.id,
                    external_id=ann_data["id"],
                    title=ann_data["title"],
                    content=ann_data.get("content"),
                    posted_at=posted,
                ))

        # --- Quizzes ---
        for q_data in connector.get_quizzes(c_data["id"]):
            existing = db.query(Quiz).filter(
                Quiz.title == q_data["title"],
                Quiz.course_id == course.id,
            ).first()
            if not existing:
                qdate = _parse_dt(q_data.get("quiz_date"))
                db.add(Quiz(
                    course_id=course.id,
                    title=q_data["title"],
                    topic=q_data.get("topic"),
                    quiz_date=qdate,
                ))

    db.commit()

    # Update last_sync
    conn = db.query(LMSConnection).filter(
        LMSConnection.user_id == user.id
    ).first()
    if conn:
        conn.last_sync = datetime.now(timezone.utc)
        db.commit()

    duration_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)

    # Log trace
    portal_label = _portal_state.get("portal_name") or "University LMS / AMS Portal"
    db.add(AgentTrace(
        user_id=user.id,
        agent="Fahmly",
        action="sync",
        status="success",
        duration_ms=duration_ms,
        safe_summary=f"Synced {courses_created or 'all'} courses with assignments, materials, announcements, and quizzes from {portal_label}.",
    ))
    db.commit()

    return {
        "status": "success",
        "duration_ms": duration_ms,
    }


@router.post("/disconnect")
def disconnect_lms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conn = db.query(LMSConnection).filter(LMSConnection.user_id == user.id).first()
    if conn:
        conn.status = "disconnected"
        db.commit()
    ams_portal_connector.disconnect()
    return {"status": "disconnected"}
