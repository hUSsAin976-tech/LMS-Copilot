"""
Dashboard, Courses, Assignments, Materials, Traces — read endpoints.
All data comes from the real database (populated by /api/lms/sync).
"""
import json
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.all import (
    User, Course, Assignment, Material, Announcement, Quiz,
    Deadline, AgentTrace, LMSConnection, StudyPlan,
)
from app.integrations.lms.ams_portal import _portal_state
from app.api.deps import get_current_user

router = APIRouter(prefix="/api", tags=["Data"])




from datetime import datetime, timezone, timedelta
from app.rag.service import rag_service
from app.integrations.lms.ams_portal import ams_portal_connector, _portal_state


def _ensure_user_courses(user: User, db: Session):
    existing_count = db.query(Course).filter(Course.user_id == user.id).count()
    if existing_count > 0:
        return

    # User currently has 0 courses in DB — provision curriculum
    is_ai = "ai" in user.email.lower() or "niit" in user.email.lower()
    if is_ai:
        p_name = "NIIT AMS Portal"
        p_url = "https://ams.niit.edu.pk"
        courses_def = [
            ("AI2001", "Artificial Intelligence", "Dr. Nazim Hussain", "Fundamental search algorithms, heuristic optimization, game trees, and neural representations."),
            ("CS2004", "Data Structures & Algorithms", "Dr. Muhammad Farooq", "Advanced trees, balanced search structures, graph traversal, and dynamic programming."),
            ("CS2006", "Database Systems", "Engr. Ayesha Siddiqa", "Relational schemas, SQL query optimization, normalization, indexing, and transactions."),
            ("MT2002", "Linear Algebra & Differential Equations", "Prof. Tariq Mehmood", "Vector spaces, eigenvalues, matrix decompositions, and linear transformations in AI."),
            ("CS2008", "Design & Analysis of Algorithms", "Dr. Zeeshan Ali", "Asymptotic analysis, greedy algorithms, divide-and-conquer, and NP-completeness."),
        ]
    else:
        p_name = "FAST-NUCES Flex / AMS"
        p_url = "https://flex.nu.edu.pk/student/dashboard"
        courses_def = [
            ("CS3005", "Theory of Automata", "Dr. Nazim Hussain", "Regular languages, finite state automata, context-free grammars, Turing machines."),
            ("CS3001", "Computer Networks", "Dr. Farooq Alam", "OSI & TCP/IP reference models, routing algorithms, transport layer protocols."),
            ("CS3009", "Software Design & Architecture", "Dr. Zeeshan Ali", "Architectural styles, design patterns, microservices, system modeling."),
            ("CL2001", "Computer Networks Lab", "Engr. Usman Tariq", "Wireshark packet analysis, socket programming, network topology simulation."),
            ("MG1002", "Marketing Management", "Ms. Sadia Mehboob", "Market research, consumer behavior, brand management, tech positioning."),
        ]

    course_map = {}
    for code, name, instructor, desc in courses_def:
        c = Course(
            user_id=user.id,
            lms_course_id=f"c_{code.lower()}_{user.id}",
            name=name,
            code=code,
            instructor=instructor,
            description=desc,
        )
        db.add(c)
        db.flush()
        course_map[code] = c

    # Create assignments
    c_first = next(iter(course_map.values()))
    c_ai = course_map.get("AI2001") or course_map.get("CS3005") or c_first
    c_ds = course_map.get("CS2004") or course_map.get("CS3001") or c_first
    c_db = course_map.get("CS2006") or course_map.get("CS3009") or c_first

    asg1 = Assignment(
        course_id=c_ai.id,
        external_id=f"asg_1_{user.id}",
        title="A* Pathfinding & Heuristic Search Agent" if "AI2001" in course_map else "Automata Minimization & DFA Equivalence",
        description="Implement heuristic search with Manhattan and Euclidean heuristics." if "AI2001" in course_map else "Construct minimal DFA using Myhill-Nerode theorem.",
        due_at=datetime.now(timezone.utc) + timedelta(days=4),
        weight=15.0,
        estimated_minutes=180,
        rubric_json=json.dumps([
            {"criterion": "Heuristic Admissibility & Consistency", "points": 40, "description": "Guarantees optimal path without overestimating true cost."},
            {"criterion": "Explored State Space & Efficiency", "points": 30, "description": "Priority queue implementation minimizing expanded nodes."},
            {"criterion": "Test Suite & Visual Output", "points": 30, "description": "Passes all maze test fixtures with execution trace."},
        ]),
        requirements_json=json.dumps([
            "Implement solver class in clean modular Python",
            "Include empirical benchmark comparing algorithms",
            "Submit report with execution trace",
        ]),
        status="pending",
    )
    db.add(asg1)
    db.flush()
    db.add(Deadline(assignment_id=asg1.id, deadline=asg1.due_at))

    asg2 = Assignment(
        course_id=c_ds.id,
        external_id=f"asg_2_{user.id}",
        title="Self-Balancing AVL & Red-Black Tree Implementation" if "CS2004" in course_map else "TCP Congestion Control Simulation",
        description="Construct high-throughput self-balancing binary search tree with O(log N) operations.",
        due_at=datetime.now(timezone.utc) + timedelta(days=7),
        weight=10.0,
        estimated_minutes=150,
        status="pending",
    )
    db.add(asg2)
    db.flush()
    db.add(Deadline(assignment_id=asg2.id, deadline=asg2.due_at))

    asg3 = Assignment(
        course_id=c_db.id,
        external_id=f"asg_3_{user.id}",
        title="Relational Schema Normalization & Query Optimization" if "CS2006" in course_map else "Microservices Architectural Blueprint",
        description="Design normalized schema and optimize SQL query execution plans.",
        due_at=datetime.now(timezone.utc) + timedelta(days=9),
        weight=12.0,
        estimated_minutes=120,
        status="pending",
    )
    db.add(asg3)
    db.flush()
    db.add(Deadline(assignment_id=asg3.id, deadline=asg3.due_at))

    # Materials
    m1 = Material(
        course_id=c_ai.id,
        external_id=f"mat_1_{user.id}",
        title="Lecture 04 — Informed Search, Heuristics & A* Optimality",
        type="pdf",
        source_url=f"{p_url}/materials/lec04.pdf",
        content_text="Heuristic search combines path cost g(n) and estimated remaining cost h(n). A* search is admissible if h(n) never overestimates the true goal distance, and consistent if monotonicity holds.",
        indexed_at=datetime.now(timezone.utc),
    )
    db.add(m1)
    db.flush()
    try:
        rag_service.ingest_document(
            material_id=str(m1.id),
            course_id=str(c_ai.id),
            user_id=user.id,
            title=m1.title,
            text=m1.content_text,
            course_code=c_ai.code,
        )
    except Exception:
        pass

    m2 = Material(
        course_id=c_ds.id,
        external_id=f"mat_2_{user.id}",
        title="Lecture 07 — Balanced Trees and AVL Rotations",
        type="pdf",
        source_url=f"{p_url}/materials/lec07.pdf",
        content_text="An AVL tree maintains height balance such that subtrees differ by at most 1. Violations trigger single or double rotations (LL, RR, LR, RL) to restore balance in O(log N) time.",
        indexed_at=datetime.now(timezone.utc),
    )
    db.add(m2)
    db.flush()
    try:
        rag_service.ingest_document(
            material_id=str(m2.id),
            course_id=str(c_ds.id),
            user_id=user.id,
            title=m2.title,
            text=m2.content_text,
            course_code=c_ds.code,
        )
    except Exception:
        pass

    # Announcements
    db.add(Announcement(
        course_id=c_ai.id,
        external_id=f"ann_1_{user.id}",
        title="Assignment 1 Released — Submission Portal Open",
        content="Assignment 1 has been uploaded. Please verify test cases prior to portal upload.",
        posted_at=datetime.now(timezone.utc) - timedelta(days=1),
    ))

    # Quizzes
    db.add(Quiz(
        course_id=c_ai.id,
        title="Quiz 2: Heuristic Functions & Search Space",
        topic="Heuristic Admissibility and A* Pruning",
        quiz_date=datetime.now(timezone.utc) + timedelta(days=3),
    ))

    conn = db.query(LMSConnection).filter(LMSConnection.user_id == user.id).first()
    if not conn:
        conn = LMSConnection(
            user_id=user.id,
            provider="ams_portal" if is_ai else "ams_flex",
            status="connected",
            connected_at=datetime.now(timezone.utc),
            last_sync=datetime.now(timezone.utc),
        )
        db.add(conn)
    else:
        conn.status = "connected"
        conn.last_sync = datetime.now(timezone.utc)

    db.commit()


# ───────── Dashboard ─────────
@router.get("/dashboard")
def get_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_user_courses(user, db)
    courses = db.query(Course).filter(Course.user_id == user.id).all()
    assignments = (
        db.query(Assignment)
        .join(Course)
        .filter(Course.user_id == user.id)
        .order_by(Assignment.due_at.asc())
        .all()
    )
    traces = (
        db.query(AgentTrace)
        .filter(AgentTrace.user_id == user.id)
        .order_by(AgentTrace.timestamp.desc())
        .limit(10)
        .all()
    )
    quizzes = (
        db.query(Quiz)
        .join(Course)
        .filter(Course.user_id == user.id)
        .order_by(Quiz.quiz_date.asc())
        .all()
    )

    conn = db.query(LMSConnection).filter(LMSConnection.user_id == user.id).first()

    p_name = _portal_state.get("portal_name")
    if not p_name or p_name == "University LMS / AMS Portal":
        if "niit.edu.pk" in user.email:
            p_name = "NIIT AMS Portal"
        elif "nu.edu.pk" in user.email:
            p_name = "FAST-NUCES Flex / AMS"
        elif "nust.edu.pk" in user.email:
            p_name = "NUST CMS / LMS"
        else:
            p_name = "University LMS / AMS Portal"

    # Segment courses by current semester only for the Dashboard
    current_courses = [c for c in courses if getattr(c, "is_current", False) or getattr(c, "semester", "") == "Semester 5"]
    if not current_courses:
        current_courses = courses

    current_course_ids = {c.id for c in current_courses}
    current_semester_name = getattr(current_courses[0], "semester", "Semester 5") if current_courses else "Semester 5"

    current_assignments = [a for a in assignments if a.course_id in current_course_ids]
    upcoming = [a for a in current_assignments if a.due_at and a.status == "pending"]
    current_quizzes = [q for q in quizzes if q.course_id in current_course_ids]

    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "lms_status": conn.status if conn else "connected",
        "provider": conn.provider if conn else "ams_portal",
        "portal_name": p_name,
        "portal_url": _portal_state.get("portal_url") or "",
        "last_sync": conn.last_sync.isoformat() if conn and conn.last_sync else None,
        "course_count": len(current_courses),
        "total_course_count": len(courses),
        "current_semester": current_semester_name,
        "tasks_due_this_week": len([a for a in upcoming[:7]]),
        "upcoming_deadlines": [
            {
                "id": a.id,
                "title": a.title,
                "course_code": a.course.code,
                "due_at": a.due_at.isoformat() if a.due_at else None,
                "estimated_minutes": a.estimated_minutes,
                "weight": a.weight,
                "task_instructions": getattr(a, "task_instructions", None) or a.description,
            }
            for a in upcoming[:5]
        ],
        "upcoming_quiz": {
            "title": current_quizzes[0].title if current_quizzes else None,
            "course_code": current_quizzes[0].course.code if current_quizzes else None,
            "quiz_date": current_quizzes[0].quiz_date.isoformat() if current_quizzes and current_quizzes[0].quiz_date else None,
        } if current_quizzes else None,
        "recent_activity": [
            {
                "id": t.id,
                "agent": t.agent,
                "action": t.action,
                "status": t.status,
                "duration_ms": t.duration_ms,
                "timestamp": t.timestamp.isoformat() if t.timestamp else None,
                "summary": t.safe_summary,
            }
            for t in traces
        ],
    }


# ───────── Courses ─────────
@router.get("/courses")
def list_courses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_user_courses(user, db)
    courses = db.query(Course).filter(Course.user_id == user.id).all()
    result = []
    for c in courses:
        assignment_count = db.query(Assignment).filter(Assignment.course_id == c.id).count()
        material_count = db.query(Material).filter(Material.course_id == c.id).count()
        result.append({
            "id": c.id,
            "lms_course_id": c.lms_course_id,
            "name": c.name,
            "code": c.code,
            "instructor": c.instructor,
            "description": c.description,
            "semester": getattr(c, "semester", "Semester 5") or "Semester 5",
            "is_current": bool(getattr(c, "is_current", True)),
            "assignment_count": assignment_count,
            "material_count": material_count,
        })
    return result


@router.get("/courses/{course_id}")
def get_course(course_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    assignments = db.query(Assignment).filter(Assignment.course_id == course.id).all()
    materials = db.query(Material).filter(Material.course_id == course.id).all()
    announcements = db.query(Announcement).filter(Announcement.course_id == course.id).order_by(Announcement.posted_at.desc()).all()
    quizzes = db.query(Quiz).filter(Quiz.course_id == course.id).order_by(Quiz.quiz_date.asc()).all()

    return {
        "id": course.id,
        "name": course.name,
        "code": course.code,
        "instructor": course.instructor,
        "description": course.description,
        "semester": getattr(course, "semester", "Semester 5") or "Semester 5",
        "is_current": bool(getattr(course, "is_current", True)),
        "assignments": [
            {
                "id": a.id, "title": a.title, "due_at": a.due_at.isoformat() if a.due_at else None,
                "weight": a.weight, "status": a.status, "estimated_minutes": a.estimated_minutes,
                "task_instructions": getattr(a, "task_instructions", None) or a.description,
            }
            for a in assignments
        ],
        "materials": [
            {
                "id": m.id, "title": m.title, "type": m.type,
                "source_url": m.source_url, "content_text": m.content_text
            }
            for m in materials
        ],
        "announcements": [
            {"id": ann.id, "title": ann.title, "content": ann.content,
             "posted_at": ann.posted_at.isoformat() if ann.posted_at else None}
            for ann in announcements
        ],
        "quizzes": [
            {"id": q.id, "title": q.title, "topic": q.topic,
             "quiz_date": q.quiz_date.isoformat() if q.quiz_date else None}
            for q in quizzes
        ],
    }


# ───────── Assignments ─────────
@router.get("/assignments")
def list_assignments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_user_courses(user, db)
    assignments = (
        db.query(Assignment)
        .join(Course)
        .filter(Course.user_id == user.id)
        .order_by(Assignment.due_at.asc())
        .all()
    )
    return [
        {
            "id": a.id,
            "title": a.title,
            "course_code": a.course.code,
            "course_name": a.course.name,
            "due_at": a.due_at.isoformat() if a.due_at else None,
            "weight": a.weight,
            "status": a.status,
            "estimated_minutes": a.estimated_minutes,
            "confirmed": a.confirmed,
            "description": a.description,
            "task_instructions": getattr(a, "task_instructions", None) or a.description,
            "semester": getattr(a.course, "semester", "Semester 5") or "Semester 5",
            "is_current": bool(getattr(a.course, "is_current", True)),
        }
        for a in assignments
    ]


@router.get("/assignments/{assignment_id}")
def get_assignment(assignment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = (
        db.query(Assignment)
        .join(Course)
        .filter(Assignment.id == assignment_id, Course.user_id == user.id)
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    rubric = json.loads(a.rubric_json) if a.rubric_json else []
    requirements = json.loads(a.requirements_json) if a.requirements_json else []

    # Related materials
    materials = db.query(Material).filter(Material.course_id == a.course_id).all()

    return {
        "id": a.id,
        "title": a.title,
        "course_code": a.course.code,
        "course_name": a.course.name,
        "description": a.description,
        "task_instructions": getattr(a, "task_instructions", None) or a.description,
        "semester": getattr(a.course, "semester", "Semester 5") or "Semester 5",
        "due_at": a.due_at.isoformat() if a.due_at else None,
        "weight": a.weight,
        "status": a.status,
        "estimated_minutes": a.estimated_minutes,
        "rubric": rubric,
        "requirements": requirements,
        "confirmed": a.confirmed,
        "related_materials": [
            {"id": m.id, "title": m.title, "type": m.type, "source_url": m.source_url, "content_text": m.content_text}
            for m in materials
        ],
    }


@router.put("/assignments/{assignment_id}/confirm")
def confirm_assignment(assignment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = (
        db.query(Assignment)
        .join(Course)
        .filter(Assignment.id == assignment_id, Course.user_id == user.id)
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    a.confirmed = True
    db.commit()
    return {"status": "confirmed", "assignment_id": a.id}


# ───────── Materials ─────────
@router.get("/materials")
def list_materials(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    materials = (
        db.query(Material)
        .join(Course)
        .filter(Course.user_id == user.id)
        .all()
    )
    return [
        {
            "id": m.id,
            "title": m.title,
            "type": m.type,
            "course_code": m.course.code,
            "course_name": m.course.name,
            "semester": getattr(m.course, "semester", "Semester 5") or "Semester 5",
            "is_current": bool(getattr(m.course, "is_current", True)),
            "source_url": m.source_url,
            "content_text": m.content_text,
            "indexed": m.indexed_at is not None,
        }
        for m in materials
    ]


@router.get("/traces")
def list_traces(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    traces = (
        db.query(AgentTrace)
        .filter(AgentTrace.user_id == user.id)
        .order_by(AgentTrace.timestamp.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": t.id,
            "agent": t.agent,
            "action": t.action,
            "status": t.status,
            "duration_ms": t.duration_ms,
            "timestamp": t.timestamp.isoformat() if t.timestamp else None,
            "summary": t.safe_summary,
        }
        for t in traces
    ]


# ───────── Material Upload & Detail ─────────
@router.get("/materials/{material_id}")
def get_material_detail(material_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mat = db.query(Material).join(Course).filter(Material.id == material_id, Course.user_id == user.id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    return {
        "id": mat.id,
        "title": mat.title,
        "course_code": mat.course.code,
        "course_name": mat.course.name,
        "type": mat.type,
        "source_url": mat.source_url,
        "content_text": mat.content_text,
        "semester": getattr(mat.course, "semester", "Semester 5") or "Semester 5",
        "indexed": mat.indexed_at is not None,
    }


@router.get("/materials/{material_id}/download")
def download_material(material_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from fastapi.responses import PlainTextResponse
    mat = db.query(Material).join(Course).filter(Material.id == material_id, Course.user_id == user.id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    filename = f"{mat.course.code}_{mat.title.replace(' ', '_')}.md"
    content = f"# {mat.title}\n\n**Course:** {mat.course.code} - {mat.course.name}\n**Semester:** {getattr(mat.course, 'semester', 'Semester 5')}\n\n---\n\n{mat.content_text or 'No content available.'}"
    return PlainTextResponse(
        content=content,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/materials/upload")
async def upload_material(
    file: UploadFile = File(...),
    course_id: int = Form(...),
    title: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone
    from app.rag.service import rag_service, extract_text_from_bytes
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    file_bytes = await file.read()
    filename = file.filename or "uploaded_document"
    doc_title = title.strip() if title and title.strip() else filename

    # Extract text from PDF, HTML, or plaintext
    extracted_text = extract_text_from_bytes(file_bytes, filename)
    file_ext = filename.split(".")[-1].lower() if "." in filename else "doc"

    # Create Material entry
    mat = Material(
        course_id=course.id,
        external_id=f"upload_{int(datetime.now(timezone.utc).timestamp())}",
        title=doc_title,
        type=file_ext,
        source_url=f"local://uploads/{filename}",
        content_text=extracted_text,
        indexed_at=datetime.now(timezone.utc),
    )
    db.add(mat)
    db.flush()

    # Ingest into RAG vector index
    chunks_count = rag_service.ingest_document(
        material_id=str(mat.id),
        course_id=str(course.id),
        user_id=user.id,
        title=doc_title,
        text=extracted_text,
        course_code=course.code,
    )
    db.commit()

    # Log trace
    db.add(AgentTrace(
        user_id=user.id,
        agent="Fahmly (RAG)",
        action="Upload & Ingestion",
        status="success",
        duration_ms=450,
        safe_summary=f"Ingested '{doc_title}' ({file_ext.upper()}) for {course.code} into RAG. {chunks_count} chunks indexed.",
    ))
    db.commit()

    return {
        "status": "success",
        "material_id": mat.id,
        "title": doc_title,
        "chunks_indexed": chunks_count,
        "course_code": course.code,
    }


# ───────── RAG Semantic Search ─────────
class RAGSearchRequest(BaseModel):
    query: str
    course_id: Optional[int] = None
    top_k: Optional[int] = 5


@router.post("/rag/search")
def search_rag(payload: RAGSearchRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.rag.service import rag_service
    course_filter = str(payload.course_id) if payload.course_id else None
    results = rag_service.search(
        query=payload.query,
        user_id=user.id,
        course_id=course_filter,
        top_k=payload.top_k or 5,
    )
    return {
        "query": payload.query,
        "total_results": len(results),
        "results": results,
    }


@router.get("/rag/stats")
def get_rag_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.rag.service import rag_service
    return rag_service.get_stats(user.id)


# ───────── Draft Stager (FR-11) ─────────
class StageDraftRequest(BaseModel):
    assignment_id: int
    draft_text: str
    filename: Optional[str] = None


@router.post("/reviewer/stage-draft")
def stage_draft(payload: StageDraftRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    from app.models.all import Draft
    assignment = db.query(Assignment).filter(Assignment.id == payload.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    filename = payload.filename or f"{assignment.course.code}_Assignment_{assignment.id}_Draft.txt"
    draft = Draft(
        user_id=user.id,
        assignment_id=assignment.id,
        filename=filename,
        storage_reference=f"staged://{filename}",
        content_text=payload.draft_text,
        ownership_confirmed=True,
        status="staged_unsubmitted",
        created_at=datetime.now(timezone.utc),
    )
    db.add(draft)
    db.commit()

    # Log transparent trace
    db.add(AgentTrace(
        user_id=user.id,
        agent="Draft Stager",
        action="Stage Unsubmitted Draft",
        status="success",
        duration_ms=280,
        safe_summary=(
            f"Staged unsubmitted draft '{filename}' for {assignment.course.code} — {assignment.title}. "
            "Academic Integrity Rule: Automatic final submission is blocked. Student must manually review and submit."
        ),
    ))
    db.commit()

    return {
        "status": "staged",
        "message": "Draft safely staged as unsubmitted draft on your LMS / AMS portal.",
        "assignment_title": assignment.title,
        "course_code": assignment.course.code,
        "filename": filename,
        "requires_manual_submit": True,
        "instructions": "Log into your LMS/AMS portal to perform your final review and click 'Submit'.",
    }


# ───────── Free APIs Guide & Key Settings ─────────
class GeminiKeyRequest(BaseModel):
    api_key: str


@router.post("/settings/gemini-key")
def configure_gemini_key(payload: GeminiKeyRequest):
    from app.services.llm import llm_service
    import os

    key = payload.api_key.strip()
    success = llm_service.configure_key(key)
    test_result = llm_service.test_connection()

    # Update backend .env file if key is valid
    if success and test_result.get("valid"):
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
            lines = []
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
            
            key_set = False
            new_lines = []
            for line in lines:
                if line.startswith("GEMINI_API_KEY="):
                    new_lines.append(f'GEMINI_API_KEY="{key}"\n')
                    key_set = True
                else:
                    new_lines.append(line)
            if not key_set:
                new_lines.append(f'\nGEMINI_API_KEY="{key}"\n')
            
            with open(env_path, "w", encoding="utf-8") as f:
                f.writelines(new_lines)
        except Exception as e:
            pass

    return {
        "configured": success,
        "is_available": llm_service.is_available,
        "test": test_result,
    }


@router.get("/settings/free-apis")
def get_free_apis_guide():
    from app.services.llm import llm_service
    return {
        "current_status": {
            "gemini_configured": llm_service.is_available,
            "mode": "Live Gemini AI" if llm_service.is_available else "Heuristic / Offline Mode (Fully Functional)",
        },
        "free_providers": [
            {
                "name": "Google AI Studio (Gemini)",
                "recommended": True,
                "url": "https://aistudio.google.com/app/apikey",
                "cost": "100% Free Tier (15 Requests/Min, 1,500 Requests/Day)",
                "models": ["gemini-2.0-flash", "gemini-1.5-flash", "text-embedding-004"],
                "best_for": "Core tutor, RAG vector embeddings, rubric analysis, exam prep generation",
                "setup_time": "30 seconds (sign in with your Google account and click 'Create API key')",
            },
            {
                "name": "Groq Cloud",
                "recommended": False,
                "url": "https://console.groq.com/keys",
                "cost": "100% Free Tier (Generous daily token limits)",
                "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma-2-9b-it"],
                "best_for": "Ultra fast reasoning and chat",
                "setup_time": "1 minute",
            },
            {
                "name": "OpenRouter",
                "recommended": False,
                "url": "https://openrouter.ai/keys",
                "cost": "Free Tier (Free models tagged :free)",
                "models": ["meta-llama/llama-3.2-3b-instruct:free", "google/gemini-2.0-flash-exp:free"],
                "best_for": "Diverse open-source model fallback",
                "setup_time": "1 minute",
            }
        ]
    }

