"""
Portal API Routes for Rahnuma AI.
Allows students to view their live university LMS / AMS portal,
trigger real-time synchronization, simulate portal updates (change detection),
and inspect real-time sync traces.
"""
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.all import (
    User, Course, Assignment, Material, Announcement, Quiz,
    Deadline, AgentTrace, LMSConnection
)
from app.integrations.lms.ams_portal import ams_portal_connector, _portal_state
from app.rag.service import rag_service, extract_text_from_bytes
from app.services.llm import llm_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/portal", tags=["LMS / AMS Portal"])


def _parse_dt(val: Any) -> Optional[datetime]:
    if not val:
        return None
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except Exception:
        return None




class SelectProviderRequest(BaseModel):
    provider: str  # ams_flex, moodle, google_classroom, custom
    portal_url: Optional[str] = None
    student_id: Optional[str] = None


class SimulateEventRequest(BaseModel):
    event_type: str  # new_assignment, new_material, deadline_extended, new_announcement
    course_id: str
    title: str
    description: Optional[str] = None
    due_in_days: Optional[int] = 5


class ConnectCredentialsRequest(BaseModel):
    provider: str
    base_url: Optional[str] = None
    api_token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


@router.get("/view")
def get_portal_view(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the live state of the student's LMS / AMS portal."""
    if not _portal_state.get("courses") or len(_portal_state.get("courses", [])) < 5:
        ams_portal_connector.hydrate_from_db(db, user)
    view = ams_portal_connector.get_portal_view(db, user)
    return view


@router.post("/select-provider")
def select_provider(payload: SelectProviderRequest):
    """Switches the active portal between FAST Flex, Moodle, Google Classroom, or Custom."""
    ams_portal_connector.switch_provider(payload.provider, payload.portal_url)
    if payload.student_id:
        _portal_state["student"]["student_id"] = payload.student_id
    return {
        "status": "success",
        "provider": _portal_state["provider"],
        "portal_name": _portal_state["portal_name"],
        "portal_url": _portal_state["portal_url"]
    }


@router.post("/sync")
def sync_portal_realtime(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start_time = datetime.now(timezone.utc)

    portal_view = ams_portal_connector.get_portal_view()
    courses_synced = 0
    assignments_synced = 0
    materials_indexed = 0
    announcements_synced = 0
    quizzes_synced = 0

    # 1. Sync Courses
    for c_data in portal_view["courses"]:
        course = db.query(Course).filter(
            Course.lms_course_id == c_data["id"],
            Course.user_id == user.id,
        ).first()
        if not course:
            # Normalize instructor: may arrive as dict from scraper
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
        courses_synced += 1

        # 2. Sync Assignments
        course_assignments = [a for a in portal_view["assignments"] if a["course_id"] == c_data["id"]]
        for a_data in course_assignments:
            existing = db.query(Assignment).filter(
                Assignment.external_id == a_data["id"],
                Assignment.course_id == course.id,
            ).first()
            due = _parse_dt(a_data.get("due_at"))

            if not existing:
                a = Assignment(
                    course_id=course.id,
                    external_id=a_data["id"],
                    title=a_data["title"],
                    description=a_data.get("description"),
                    due_at=due,
                    weight=a_data.get("weight"),
                    estimated_minutes=a_data.get("estimated_minutes"),
                    rubric_json=json.dumps(a_data.get("rubric", [])),
                    requirements_json=json.dumps(a_data.get("requirements", [])),
                    status=a_data.get("status", "pending"),
                )
                db.add(a)
                db.flush()
                if due:
                    db.add(Deadline(assignment_id=a.id, deadline=due))
            else:
                existing.title = a_data["title"]
                existing.description = a_data.get("description")
                existing.due_at = due
            assignments_synced += 1

        # 3. Sync Materials and Ingest into RAG
        course_materials = [m for m in portal_view["materials"] if m["course_id"] == c_data["id"]]
        for m_data in course_materials:
            existing_mat = db.query(Material).filter(
                Material.external_id == m_data["id"],
                Material.course_id == course.id,
            ).first()
            if not existing_mat:
                existing_mat = Material(
                    course_id=course.id,
                    external_id=m_data["id"],
                    title=m_data["title"],
                    type=m_data.get("type", "pdf"),
                    source_url=m_data.get("source_url"),
                    content_text=m_data.get("content_text"),
                    indexed_at=datetime.now(timezone.utc),
                )
                db.add(existing_mat)
                db.flush()
            else:
                existing_mat.content_text = m_data.get("content_text")
                existing_mat.indexed_at = datetime.now(timezone.utc)

            # Ingest to RAG
            chunks_added = rag_service.ingest_document(
                material_id=str(existing_mat.id or m_data["id"]),
                course_id=str(course.id),
                user_id=user.id,
                title=existing_mat.title,
                text=existing_mat.content_text or existing_mat.title,
                course_code=course.code
            )
            materials_indexed += 1

        # 4. Announcements
        course_announcements = [ann for ann in portal_view["announcements"] if ann["course_id"] == c_data["id"]]
        for ann_data in course_announcements:
            existing_ann = db.query(Announcement).filter(
                Announcement.external_id == ann_data["id"],
                Announcement.course_id == course.id,
            ).first()
            if not existing_ann:
                posted = _parse_dt(ann_data.get("posted_at"))
                db.add(Announcement(
                    course_id=course.id,
                    external_id=ann_data["id"],
                    title=ann_data["title"],
                    content=ann_data.get("content"),
                    posted_at=posted,
                ))
            announcements_synced += 1

        # 5. Quizzes
        course_quizzes = [q for q in portal_view["quizzes"] if q["course_id"] == c_data["id"]]
        for q_data in course_quizzes:
            existing_q = db.query(Quiz).filter(
                Quiz.title == q_data["title"],
                Quiz.course_id == course.id,
            ).first()
            if not existing_q:
                qdate = _parse_dt(q_data.get("quiz_date"))
                db.add(Quiz(
                    course_id=course.id,
                    title=q_data["title"],
                    topic=q_data.get("topic"),
                    quiz_date=qdate,
                ))
            quizzes_synced += 1

    # Update LMSConnection record
    conn = db.query(LMSConnection).filter(LMSConnection.user_id == user.id).first()
    if not conn:
        conn = LMSConnection(
            user_id=user.id,
            provider=_portal_state["provider"],
            status="connected",
            connected_at=datetime.now(timezone.utc),
            last_sync=datetime.now(timezone.utc),
        )
        db.add(conn)
    else:
        conn.status = "connected"
        conn.provider = _portal_state["provider"]
        conn.last_sync = datetime.now(timezone.utc)

    db.commit()

    _portal_state["last_sync"] = datetime.now(timezone.utc).isoformat()
    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

    # Log Fahmly Trace
    db.add(AgentTrace(
        user_id=user.id,
        agent="Fahmly",
        action="Real-time Portal Sync",
        status="success",
        duration_ms=duration_ms,
        safe_summary=(
            f"Real-time sync with {_portal_state['portal_name']}: "
            f"{courses_synced} courses, {assignments_synced} assignments, "
            f"{materials_indexed} lecture materials indexed in RAG, "
            f"{announcements_synced} announcements, {quizzes_synced} quizzes."
        ),
    ))
    db.commit()

    return {
        "status": "success",
        "portal_name": _portal_state["portal_name"],
        "portal_url": _portal_state["portal_url"],
        "duration_ms": duration_ms,
        "courses_synced": courses_synced,
        "assignments_synced": assignments_synced,
        "materials_indexed": materials_indexed,
        "announcements_synced": announcements_synced,
        "quizzes_synced": quizzes_synced,
        "last_sync": _portal_state["last_sync"],
    }


@router.post("/simulate-event")
def simulate_portal_event(payload: SimulateEventRequest, db: Session = Depends(get_db)):
    """
    Simulates a university instructor updating the portal:
    e.g. posting a new assignment, uploading new slides, or posting an announcement.
    Enables instant demonstration of real-time change detection.
    """
    if payload.event_type == "new_assignment":
        res = ams_portal_connector.add_portal_assignment(
            course_id=payload.course_id,
            title=payload.title,
            description=payload.description or "Complete the assigned tasks and upload your draft for rubric review.",
            due_in_days=payload.due_in_days or 5,
        )
        return {"status": "success", "event": "new_assignment", "data": res}

    elif payload.event_type == "new_material":
        res = ams_portal_connector.add_portal_material(
            course_id=payload.course_id,
            title=payload.title,
            content_text=payload.description or f"Comprehensive lecture notes on {payload.title}.",
        )
        return {"status": "success", "event": "new_material", "data": res}

    elif payload.event_type == "new_announcement":
        ann = {
            "id": f"ams_ann_{len(_portal_state['announcements']) + 1}",
            "course_id": payload.course_id,
            "title": payload.title,
            "content": payload.description or "Important course notice from faculty.",
            "posted_at": datetime.now(timezone.utc).isoformat(),
        }
        _portal_state["announcements"].insert(0, ann)
        _portal_state["change_log"].append({
            "type": "new_announcement",
            "title": payload.title,
            "course_id": payload.course_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": f"Notice: {payload.title}"
        })
        return {"status": "success", "event": "new_announcement", "data": ann}

    return {"status": "ignored"}


@router.get("/changes")
def get_portal_changes():
    """Returns detected changes on the LMS / AMS portal."""
    return {
        "changes": _portal_state["change_log"][-10:],
        "unread_count": len(_portal_state["change_log"]),
    }


@router.post("/connect-credentials")
def connect_credentials(payload: ConnectCredentialsRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Configures real external credentials (e.g. Moodle URL + token, Google Classroom, AMS session)."""
    conn = db.query(LMSConnection).filter(LMSConnection.user_id == user.id).first()
    if not conn:
        conn = LMSConnection(
            user_id=user.id,
            provider=payload.provider,
            status="connected",
            connected_at=datetime.now(timezone.utc),
        )
        db.add(conn)
    else:
        conn.provider = payload.provider
        conn.status = "connected"
    db.commit()

    if payload.base_url:
        _portal_state["portal_url"] = payload.base_url
    _portal_state["provider"] = payload.provider

    return {
        "status": "connected",
        "provider": payload.provider,
        "message": f"Successfully connected to {payload.provider.upper()} portal."
    }
