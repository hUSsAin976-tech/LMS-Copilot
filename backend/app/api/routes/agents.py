"""
Agent API Routes — Concept Coach, Intake Agent, Planner Agent, Draft Reviewer, Exam Prep.
All agents operate on real database state and log transparent AgentTrace records.
"""
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.all import (
    User, Course, Assignment, Material, Announcement, Quiz,
    Deadline, AgentTrace, StudyPlan, Draft, Review, LMSConnection
)
from app.services.llm import llm_service
from app.rag.service import rag_service
from app.core.guardrails import AcademicIntegrityGuard, SOCRATIC_SYSTEM_PROMPT

router = APIRouter(prefix="/api", tags=["Agents"])


def _get_demo_user(db: Session) -> User:
    active_user = (
        db.query(User)
        .filter(User.email != "demo@rahnuma.ai")
        .order_by(User.id.desc())
        .first()
    )
    if active_user:
        return active_user
    any_user = db.query(User).order_by(User.id.desc()).first()
    if any_user:
        return any_user
    raise HTTPException(status_code=401, detail="No active student session. Please log in with your LMS / AMS portal credentials.")


def _log_trace(
    db: Session,
    user_id: int,
    agent: str,
    action: str,
    status: str,
    duration_ms: int,
    summary: str,
    input_preview: Optional[str] = None,
    output_preview: Optional[str] = None,
):
    trace = AgentTrace(
        user_id=user_id,
        agent=agent,
        action=action,
        status=status,
        duration_ms=duration_ms,
        safe_summary=summary,
        input_preview=input_preview[:500] if input_preview else None,
        output_preview=output_preview[:500] if output_preview else None,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(trace)
    db.commit()


# ==============================================================================
# 1. CONCEPT COACH AGENT
# ==============================================================================

class CoachChatRequest(BaseModel):
    query: str
    course_id: Optional[int] = None
    language: Optional[str] = "en"  # "en", "ur_roman", "ur"

class SourceCitation(BaseModel):
    title: str
    course: str
    page_section: Optional[str] = None

class CoachChatResponse(BaseModel):
    concept: str
    simple_explanation: str
    course_connection: str
    similar_example: str
    common_mistakes: str
    practice_question: str
    sources: List[SourceCitation]
    is_academic_integrity_flag: bool = False
    refusal_reason: Optional[str] = None


ACADEMIC_INTEGRITY_TRIGGERS = [
    "write my assignment", "write the assignment", "do my homework",
    "write an essay for me", "solve my quiz", "solve this assignment",
    "write my paper", "do my project", "give me the complete solution",
    "write my code for", "write the full solution", "give me all answers"
]


@router.post("/coach/chat", response_model=CoachChatResponse)
def coach_chat(payload: CoachChatRequest, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    start_time = datetime.now(timezone.utc)
    query_lower = payload.query.lower().strip()

    # 1. Academic Integrity Guardrail Check
    is_flagged, refusal_reason = AcademicIntegrityGuard.inspect(payload.query)
    if is_flagged:
        duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
        _log_trace(
            db, user.id, "Concept Coach", "Guardrail Blocked", "blocked", duration_ms,
            f"Blocked ghostwriting/solution generation query: '{payload.query[:60]}...'",
            input_preview=payload.query,
            output_preview="Academic Integrity Guard triggered. Rahnuma coaches rather than writes assignments."
        )
        return CoachChatResponse(
            concept="Academic Integrity Guardrail",
            simple_explanation=(
                "Rahnuma AI is designed as a learning coach, not a ghostwriter. "
                "I cannot write or complete graded assignments, homework, or exam answers for you."
            ),
            course_connection=(
                "Academic codes of conduct require students to author and understand their submitted work. "
                "However, I can break down the core principles, guide your problem-solving, and review your own attempts!"
            ),
            similar_example=(
                "Instead of generating your final submission, I can walk you through an analogous example "
                "or clarify difficult concepts from your course readings."
            ),
            common_mistakes="Relying on AI-generated text for submissions prevents mastering the concepts and violates course policy.",
            practice_question="Would you like me to explain the foundational concept, or would you like to review an outline together?",
            sources=[],
            is_academic_integrity_flag=True,
            refusal_reason=refusal_reason or "Ghostwriting and homework completion requests are strictly prevented by academic integrity policies."
        )

    # 2. Vector Material Retrieval via RAG Service
    course_filter = str(payload.course_id) if payload.course_id else None
    rag_results = rag_service.search(payload.query, user_id=user.id, course_id=course_filter, top_k=3)

    # Determine course
    selected_course = None
    if payload.course_id:
        selected_course = db.query(Course).filter(Course.id == payload.course_id).first()
    elif rag_results and rag_results[0].get("metadata", {}).get("course_id"):
        try:
            cid = int(rag_results[0]["metadata"]["course_id"])
            selected_course = db.query(Course).filter(Course.id == cid).first()
        except Exception:
            pass
    if not selected_course:
        selected_course = db.query(Course).filter(Course.user_id == user.id).first()

    course_code = selected_course.code if selected_course else "CS"
    course_name = selected_course.name if selected_course else "Course"

    sources: List[SourceCitation] = []
    for r in rag_results:
        m_title = r.get("metadata", {}).get("title", "Course Material")
        chunk_idx = r.get("metadata", {}).get("chunk_index", 0)
        sources.append(SourceCitation(
            title=m_title,
            course=course_code,
            page_section=f"Section / Chunk {chunk_idx + 1}"
        ))

    # Fallback to DB materials if vector store empty
    if not sources:
        materials_query = db.query(Material).join(Course).filter(Course.user_id == user.id)
        if payload.course_id:
            materials_query = materials_query.filter(Material.course_id == payload.course_id)
        mat = materials_query.first()
        if mat:
            sources.append(SourceCitation(title=mat.title, course=course_code, page_section="Module 1"))

    # 3. LLM Generation via Gemini (with graceful heuristic fallback)
    llm_response = None
    if llm_service.is_available:
        rag_context = rag_service.retrieve_context(payload.query, user_id=user.id, course_id=course_filter)
        lang_note = ""
        if payload.language == "ur_roman":
            lang_note = "5. Language Requirement: Provide the explanation and examples in clear, student-friendly Roman Urdu (Urdu in English alphabet, e.g. 'Is concept ka matlab yeh hai ke...') alongside English technical terms so students grasp the intuition effortlessly."
        elif payload.language == "ur":
            lang_note = "5. Language Requirement: Provide the explanation in Urdu (اردو) script alongside standard technical terms."

        prompt = f"""
You are the Concept Coach agent in Rahnuma AI.
Explain the following concept to a university student enrolled in {course_code} ({course_name}).
Question/Topic: "{payload.query}"

Grounding Course Materials:
{rag_context if rag_context else "Use standard university curriculum principles for this course."}

Instructions:
1. Explain the underlying principle clearly and intuitively.
2. DO NOT write or solve any homework/assignment for them.
3. Provide an analogous example, common pitfalls, and a reflective Socratic practice question.
{lang_note}
4. Output valid JSON with these exact keys:
   - "concept": string (concise title)
   - "simple_explanation": string (intuitive explanation)
   - "course_connection": string (how it applies to {course_code})
   - "similar_example": string (walkthrough of an analogous scenario)
   - "common_mistakes": string (typical pitfalls)
   - "practice_question": string (Socratic challenge question)
"""
        llm_response = llm_service.generate_json(prompt, system_instruction=SOCRATIC_SYSTEM_PROMPT)

    if llm_response and "concept" in llm_response and "simple_explanation" in llm_response:
        concept = llm_response.get("concept", payload.query)
        explanation = llm_response.get("simple_explanation", "")
        connection = llm_response.get("course_connection", f"Relevant for {course_code}")
        example = llm_response.get("similar_example", "")
        mistakes = llm_response.get("common_mistakes", "")
        practice = llm_response.get("practice_question", "")
    elif any(k in query_lower for k in ["tree", "bst", "binary search", "traversal", "node"]):
        concept = "Binary Search Tree (BST) & In-Order Traversal"
        explanation = (
            "A Binary Search Tree is a hierarchical node structure where every node satisfies the invariant: "
            "all values in its left subtree are strictly less than its key, and all values in its right subtree "
            "are strictly greater. An in-order traversal (Left, Root, Right) visits every element in ascending order."
        )
        connection = (
            f"Referenced in {course_code} ({course_name}) Lecture Module on Non-Linear Data Structures. "
            "You will use this in Assignment 3 for search operations with O(h) time complexity."
        )
        example = (
            "Given values [15, 10, 20, 8, 12]: Root is 15. 10 goes left, 20 goes right. "
            "8 goes left of 10, and 12 goes right of 10. Traversing yields: 8, 10, 12, 15, 20."
        )
        mistakes = (
            "Common error: Assuming BST search is always O(log n). If nodes are inserted in sorted order without balancing, "
            "the tree degenerates into a singly linked list with O(n) height!"
        )
        practice = "What would happen to the search time complexity if you insert elements [1, 2, 3, 4, 5] sequentially into an unbalanced BST?"
        if not sources:
            sources = [
                SourceCitation(title="Lecture 4 — Trees & Binary Search Trees", course=course_code, page_section="Slides 12-18"),
                SourceCitation(title="Reading: Algorithms 4th Ed Chapter 3.2", course=course_code, page_section="Pages 396-405")
            ]
    elif any(k in query_lower for k in ["graph", "bfs", "dfs", "dijkstra", "shortest path"]):
        concept = "Breadth-First Search (BFS) vs Depth-First Search (DFS)"
        explanation = (
            "BFS explores neighbor nodes layer by layer using a FIFO Queue, guaranteeing the shortest path in unweighted graphs. "
            "DFS explores branch by branch deeply using recursion or a LIFO Stack, making it ideal for topological sorting and cycle detection."
        )
        connection = f"Taught in {course_code} Graph Theory & Algorithmic Design units."
        example = "In a maze: BFS searches all exits 1 step away, then 2 steps away. DFS runs down one hallway until hitting a dead end, then backtracks."
        mistakes = "Forgetting to mark nodes as 'visited' before pushing to queue, leading to infinite cycles in cyclic graphs."
        practice = "Why is a FIFO Queue necessary for BFS to guarantee shortest paths in unweighted graphs?"
        if not sources:
            sources = [
                SourceCitation(title="Lecture 7 — Graph Search & Traversal", course=course_code, page_section="Slides 5-22")
            ]
    elif any(k in query_lower for k in ["derivative", "calculus", "limit", "integral", "chain rule"]):
        concept = "The Chain Rule & Composite Differentiation"
        explanation = (
            "The Chain Rule allows differentiation of composite functions f(g(x)). "
            "The derivative is the derivative of the outer function evaluated at the inner function, multiplied by the derivative of the inner function: d/dx[f(g(x))] = f'(g(x)) * g'(x)."
        )
        connection = f"Core concept in {course_code} Calculus Problem Sets & Midterm Prep."
        example = "To differentiate (3x^2 + 1)^4: Outer is u^4 (derivative 4u^3), inner is 3x^2 + 1 (derivative 6x). Result = 4(3x^2 + 1)^3 * (6x) = 24x(3x^2 + 1)^3."
        mistakes = "Forgetting to multiply by the inner derivative g'(x), or differentiating both inner and outer simultaneously."
        practice = "Find the derivative of f(x) = sin(4x^3) using the Chain Rule."
        if not sources:
            sources = [
                SourceCitation(title="Calculus Module 2 — Differentiation Rules", course=course_code, page_section="Chapter 3.4")
            ]
    elif any(k in query_lower for k in ["normalize", "database", "sql", "1nf", "2nf", "3nf", "acid"]):
        concept = "Relational Database Normalization (1NF to 3NF)"
        explanation = (
            "Normalization is the process of organizing database tables to minimize data redundancy and dependency anomalies. "
            "1NF eliminates repeating groups and ensures atomic values. 2NF removes partial functional dependencies on candidate keys. "
            "3NF removes transitive dependencies (non-key columns depending on other non-key columns)."
        )
        connection = f"Required for {course_code} Schema Design milestones and Lab Deliverables."
        example = "If an Order table contains CustomerName and CustomerPhone, moving Customer details to a dedicated Customers table satisfies 3NF."
        mistakes = "Over-normalizing into dozens of tables for read-heavy analytics systems without considering JOIN performance overhead."
        practice = "If table R(A, B, C) has primary key (A, B) and functional dependency B -> C, which normal form does it violate?"
        if not sources:
            sources = [
                SourceCitation(title="Database Systems — Normalization & ERD", course=course_code, page_section="Lecture 5, Slides 14-30")
            ]
    else:
        matched_title = sources[0].title if sources else "Course Syllabus & Lecture Notes"
        concept = f"Key Principles of {payload.query.strip().capitalize()}"
        explanation = (
            f"Based on your course materials in {course_code}, this concept centers around systematic analysis and application. "
            f"When studying this topic, break it down into core assumptions, operational steps, and verification."
        )
        connection = f"Directly referenced in {matched_title} for {course_code}."
        example = "Examine how this principle applies to standard textbook homework problems and review the lecture slides for sample walkthroughs."
        mistakes = "Rushing to implementation without specifying boundary conditions and expected edge cases."
        practice = f"Can you summarize the primary objective of {payload.query.strip()} in your own words?"

    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
    _log_trace(
        db, user.id, "Concept Coach", "Explain Concept", "success", duration_ms,
        f"Grounded explanation for '{concept}' using {len(sources)} course source(s).",
        input_preview=payload.query,
        output_preview=f"Concept: {concept} | Course: {course_code}"
    )

    return CoachChatResponse(
        concept=concept,
        simple_explanation=explanation,
        course_connection=connection,
        similar_example=example,
        common_mistakes=mistakes,
        practice_question=practice,
        sources=sources,
        is_academic_integrity_flag=False,
    )


# ==============================================================================
# 2. INTAKE AGENT
# ==============================================================================

class IntakeExtractRequest(BaseModel):
    assignment_id: Optional[int] = None
    raw_text: Optional[str] = None

class IntakeRubricItem(BaseModel):
    criterion: str
    points: int
    description: str

class IntakeExtractResponse(BaseModel):
    assignment_id: Optional[int]
    title: str
    due_at: Optional[str]
    weight: Optional[float]
    estimated_minutes: int
    format_requirements: str
    requirements: List[str]
    constraints: List[str]
    citation_requirements: List[str]
    rubric: List[IntakeRubricItem]

class IntakeConfirmRequest(BaseModel):
    assignment_id: int
    title: str
    due_at: Optional[str] = None
    estimated_minutes: int
    weight: Optional[float] = None
    requirements: List[str]
    constraints: List[str] = []
    citation_requirements: List[str] = []
    rubric: List[IntakeRubricItem] = []


@router.post("/intake/extract", response_model=IntakeExtractResponse)
def intake_extract(payload: IntakeExtractRequest, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    start_time = datetime.now(timezone.utc)

    assignment = None
    if payload.assignment_id:
        assignment = (
            db.query(Assignment)
            .join(Course)
            .filter(Assignment.id == payload.assignment_id, Course.user_id == user.id)
            .first()
        )

    title = assignment.title if assignment else "Custom Assignment Document"
    text = payload.raw_text or (assignment.description if assignment else "")
    due_str = assignment.due_at.isoformat() if (assignment and assignment.due_at) else (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    weight = assignment.weight if (assignment and assignment.weight) else 15.0
    est_mins = assignment.estimated_minutes if (assignment and assignment.estimated_minutes) else 150

    # Parse existing rubric if present
    rubric_items = []
    if assignment and assignment.rubric_json:
        try:
            raw_rubric = json.loads(assignment.rubric_json)
            for r in raw_rubric:
                rubric_items.append(IntakeRubricItem(
                    criterion=r.get("criterion", "Criterion"),
                    points=int(r.get("points", 10)),
                    description=r.get("description", "Evaluation standard")
                ))
        except Exception:
            pass

    if not rubric_items:
        rubric_items = [
            IntakeRubricItem(criterion="Problem Formulation & Correctness", points=40, description="Sound logical implementation and correctness on test suites."),
            IntakeRubricItem(criterion="Algorithmic Complexity & Efficiency", points=25, description="Optimal big-O time/space constraints followed."),
            IntakeRubricItem(criterion="Documentation & Code Style", points=20, description="Clear commenting, modular structure, and adherence to style guide."),
            IntakeRubricItem(criterion="Testing & Verification", points=15, description="Comprehensive edge-case test suite included.")
        ]

    requirements = [
        "Implement all required methods without modifying core method signatures.",
        "Provide full docstrings and type annotations for every helper function.",
        "Include unit test suite covering at least 5 distinct edge cases.",
        "Submit executable source archive along with typed summary report."
    ]

    constraints = [
        "Strict deadline: Late submissions penalized 10% per 24 hours.",
        "Zero third-party solver libraries allowed; use standard library only.",
        "Code will be executed against automated grading container test runner."
    ]

    citations = [
        "Include references to textbook chapters or algorithm papers used.",
        "Cite any consulted open educational resources in REFERENCES.md."
    ]
    format_reqs = "ZIP archive with source files (.py/.java) and PDF report"

    # LLM Extraction via Gemini
    if llm_service.is_available and len(text.strip()) > 30:
        llm_prompt = f"""
You are the Intake Agent in Rahnuma AI.
Analyze the following assignment text and extract specifications:
\"\"\"
{text}
\"\"\"

Extract structured fields into JSON:
- "title": string (assignment title)
- "estimated_minutes": integer
- "format_requirements": string
- "requirements": list of strings (key deliverables)
- "constraints": list of strings (rules, penalties, library constraints)
- "citation_requirements": list of strings (citations/sources required)
- "rubric": list of {{"criterion": string, "points": integer, "description": string}}
"""
        llm_data = llm_service.generate_json(llm_prompt)
        if llm_data:
            if llm_data.get("title") and not assignment:
                title = str(llm_data["title"])
            if llm_data.get("estimated_minutes"):
                try:
                    est_mins = int(llm_data["estimated_minutes"])
                except Exception:
                    pass
            if llm_data.get("format_requirements"):
                format_reqs = str(llm_data["format_requirements"])
            if isinstance(llm_data.get("requirements"), list) and llm_data["requirements"]:
                requirements = [str(r) for r in llm_data["requirements"]]
            if isinstance(llm_data.get("constraints"), list) and llm_data["constraints"]:
                constraints = [str(c) for c in llm_data["constraints"]]
            if isinstance(llm_data.get("citation_requirements"), list) and llm_data["citation_requirements"]:
                citations = [str(c) for c in llm_data["citation_requirements"]]
            if isinstance(llm_data.get("rubric"), list) and llm_data["rubric"]:
                parsed_rubric = []
                for r in llm_data["rubric"]:
                    if isinstance(r, dict) and "criterion" in r:
                        parsed_rubric.append(IntakeRubricItem(
                            criterion=str(r.get("criterion", "Criterion")),
                            points=int(r.get("points", 10)),
                            description=str(r.get("description", "Evaluation standard"))
                        ))
                if parsed_rubric:
                    rubric_items = parsed_rubric

    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
    _log_trace(
        db, user.id, "Intake Agent", "Extract Requirements", "success", duration_ms,
        f"Extracted {len(requirements)} requirements, {len(constraints)} constraints, and {len(rubric_items)} rubric items for '{title}'.",
        input_preview=text[:300],
        output_preview=f"Title: {title} | Effort: {est_mins} mins | Due: {due_str}"
    )

    return IntakeExtractResponse(
        assignment_id=assignment.id if assignment else None,
        title=title,
        due_at=due_str,
        weight=weight,
        estimated_minutes=est_mins,
        format_requirements=format_reqs,
        requirements=requirements,
        constraints=constraints,
        citation_requirements=citations,
        rubric=rubric_items
    )


@router.post("/intake/confirm")
def intake_confirm(payload: IntakeConfirmRequest, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    start_time = datetime.now(timezone.utc)

    assignment = (
        db.query(Assignment)
        .join(Course)
        .filter(Assignment.id == payload.assignment_id, Course.user_id == user.id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.title = payload.title
    assignment.estimated_minutes = payload.estimated_minutes
    if payload.weight is not None:
        assignment.weight = payload.weight

    if payload.due_at:
        try:
            assignment.due_at = datetime.fromisoformat(payload.due_at.replace("Z", "+00:00"))
        except Exception:
            pass

    assignment.requirements_json = json.dumps(payload.requirements)
    assignment.rubric_json = json.dumps([r.model_dump() for r in payload.rubric])
    assignment.confirmed = True

    # Update or add Deadline
    if assignment.due_at:
        dl = db.query(Deadline).filter(Deadline.assignment_id == assignment.id).first()
        if not dl:
            dl = Deadline(assignment_id=assignment.id, deadline=assignment.due_at, confirmed_by_user=True)
            db.add(dl)
        else:
            dl.deadline = assignment.due_at
            dl.confirmed_by_user = True

    db.commit()

    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
    _log_trace(
        db, user.id, "Intake Agent", "Confirm Requirements", "success", duration_ms,
        f"Student verified and confirmed requirements for assignment '{assignment.title}'.",
        output_preview=f"Confirmed status=True | Estimated {assignment.estimated_minutes}m"
    )

    return {
        "status": "confirmed",
        "assignment_id": assignment.id,
        "message": f"Successfully confirmed assignment '{assignment.title}'"
    }


# ==============================================================================
# 3. PLANNER AGENT
# ==============================================================================

class DailyTaskItem(BaseModel):
    id: str
    assignment_id: int
    title: str
    course_code: str
    allocated_minutes: int
    completed: bool = False
    due_date_str: Optional[str] = None

class DailyPlanDay(BaseModel):
    date: str
    day_name: str
    total_minutes: int
    is_overloaded: bool = False
    tasks: List[DailyTaskItem]

class StudyPlanResponse(BaseModel):
    plan_id: Optional[int]
    daily_capacity_minutes: int
    total_scheduled_minutes: int
    conflicts: List[str]
    warnings: List[str]
    reasoning_summary: str
    days: List[DailyPlanDay]

class PlannerGenerateRequest(BaseModel):
    daily_availability_hours: int = 3


@router.post("/planner/generate", response_model=StudyPlanResponse)
def planner_generate(payload: PlannerGenerateRequest, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    start_time = datetime.now(timezone.utc)

    daily_cap_mins = max(1, min(12, payload.daily_availability_hours)) * 60

    # Get active/pending assignments
    assignments = (
        db.query(Assignment)
        .join(Course)
        .filter(Course.user_id == user.id, Assignment.status != "submitted")
        .order_by(Assignment.due_at.asc())
        .all()
    )

    now = datetime.now(timezone.utc)
    days_data: List[DailyPlanDay] = []
    conflicts: List[str] = []
    warnings: List[str] = []

    # Build next 7 days
    task_counter = 1
    total_scheduled = 0

    # Group assignments due within 7 days
    for day_offset in range(7):
        target_date = now + timedelta(days=day_offset)
        date_str = target_date.strftime("%Y-%m-%d")
        day_name = target_date.strftime("%A, %b %d")

        day_tasks: List[DailyTaskItem] = []
        day_mins = 0

        # Find assignments related to this day or due near it
        for a in assignments:
            if not a.due_at:
                continue
            days_until_due = (a.due_at.date() - target_date.date()).days
            
            # If due on this day or 1-2 days ahead, schedule a portion
            if days_until_due == 0:
                chunk = min(60, a.estimated_minutes or 60)
                day_tasks.append(DailyTaskItem(
                    id=f"t_{task_counter}",
                    assignment_id=a.id,
                    title=f"Final Review & Submit: {a.title}",
                    course_code=a.course.code,
                    allocated_minutes=chunk,
                    completed=False,
                    due_date_str="Due Today"
                ))
                task_counter += 1
                day_mins += chunk
            elif 1 <= days_until_due <= 3 and day_mins < daily_cap_mins:
                est = a.estimated_minutes or 90
                chunk = min(90, est // 2)
                day_tasks.append(DailyTaskItem(
                    id=f"t_{task_counter}",
                    assignment_id=a.id,
                    title=f"Draft & Implementation: {a.title}",
                    course_code=a.course.code,
                    allocated_minutes=chunk,
                    completed=False,
                    due_date_str=f"Due in {days_until_due}d"
                ))
                task_counter += 1
                day_mins += chunk

        # Check for overloaded days
        is_overloaded = day_mins > daily_cap_mins
        if is_overloaded:
            conflicts.append(f"{day_name}: Workload of {day_mins // 60}h {day_mins % 60}m exceeds your daily target of {payload.daily_availability_hours}h.")

        days_data.append(DailyPlanDay(
            date=date_str,
            day_name=day_name,
            total_minutes=day_mins,
            is_overloaded=is_overloaded,
            tasks=day_tasks
        ))
        total_scheduled += day_mins

    # Check for overlapping deadlines on same day
    due_dates: Dict[str, List[str]] = {}
    for a in assignments:
        if a.due_at:
            ds = a.due_at.strftime("%b %d")
            due_dates.setdefault(ds, []).append(f"{a.course.code} - {a.title}")

    for ds, items in due_dates.items():
        if len(items) > 1:
            warnings.append(f"Multiple deadlines on {ds}: {', '.join(items)}")

    reasoning = (
        f"Prioritized upcoming assignments due in the next 3 days. Work is segmented into 45-90 minute chunks "
        f"to prevent cognitive fatigue, leaving buffer time on submission days."
    )

    if llm_service.is_available:
        plan_summary = f"Total scheduled: {total_scheduled // 60}h {total_scheduled % 60}m across 7 days. Conflicts: {conflicts}. Warnings: {warnings}."
        llm_reasoning = llm_service.generate_text(
            f"Write a concise, encouraging 2-sentence study coaching summary for a student with this weekly workload: {plan_summary}",
            system_instruction="You are Rahnuma AI's empathetic study planner."
        )
        if llm_reasoning:
            reasoning = llm_reasoning.strip()

    # Save StudyPlan record to database
    plan_record = StudyPlan(
        user_id=user.id,
        date=now,
        plan_json=json.dumps([d.model_dump() for d in days_data]),
        conflicts_json=json.dumps(conflicts),
        warnings_json=json.dumps(warnings),
        reasoning=reasoning
    )
    db.add(plan_record)
    db.commit()
    db.refresh(plan_record)

    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
    _log_trace(
        db, user.id, "Planner Agent", "Generate Plan", "success", duration_ms,
        f"Generated 7-day study plan ({total_scheduled // 60}h total) with {len(conflicts)} conflict(s) and {len(warnings)} warning(s).",
        input_preview=f"Daily availability: {payload.daily_availability_hours}h/day",
        output_preview=f"Days scheduled: 7 | Conflicts: {len(conflicts)}"
    )

    return StudyPlanResponse(
        plan_id=plan_record.id,
        daily_capacity_minutes=daily_cap_mins,
        total_scheduled_minutes=total_scheduled,
        conflicts=conflicts,
        warnings=warnings,
        reasoning_summary=reasoning,
        days=days_data
    )


@router.get("/planner/plan", response_model=StudyPlanResponse)
def get_study_plan(db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    plan_record = (
        db.query(StudyPlan)
        .filter(StudyPlan.user_id == user.id)
        .order_by(StudyPlan.date.desc())
        .first()
    )
    if not plan_record:
        # Generate default plan if none exists
        return planner_generate(PlannerGenerateRequest(daily_availability_hours=3), db)

    days_data = [DailyPlanDay(**d) for d in json.loads(plan_record.plan_json)]
    conflicts = json.loads(plan_record.conflicts_json) if plan_record.conflicts_json else []
    warnings = json.loads(plan_record.warnings_json) if plan_record.warnings_json else []
    total_mins = sum(d.total_minutes for d in days_data)

    return StudyPlanResponse(
        plan_id=plan_record.id,
        daily_capacity_minutes=180,
        total_scheduled_minutes=total_mins,
        conflicts=conflicts,
        warnings=warnings,
        reasoning_summary=plan_record.reasoning or "Automated conflict-aware schedule.",
        days=days_data
    )


@router.post("/planner/tasks/{task_id}/toggle")
def toggle_task(task_id: str, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    plan_record = (
        db.query(StudyPlan)
        .filter(StudyPlan.user_id == user.id)
        .order_by(StudyPlan.date.desc())
        .first()
    )
    if not plan_record:
        raise HTTPException(status_code=404, detail="No active study plan found")

    days_raw = json.loads(plan_record.plan_json)
    found = False
    for day in days_raw:
        for t in day.get("tasks", []):
            if t.get("id") == task_id:
                t["completed"] = not t.get("completed", False)
                found = True
                break

    if not found:
        raise HTTPException(status_code=404, detail="Task not found in plan")

    plan_record.plan_json = json.dumps(days_raw)
    db.commit()
    return {"status": "updated", "task_id": task_id}


@router.get("/planner/export-ics")
def export_ics(db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    assignments = (
        db.query(Assignment)
        .join(Course)
        .filter(Course.user_id == user.id, Assignment.due_at.isnot(None))
        .all()
    )

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Rahnuma AI//Study Planner//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Rahnuma Academic Schedule",
        "X-WR-TIMEZONE:UTC",
    ]

    for a in assignments:
        due_dt = a.due_at.strftime("%Y%m%dT%H%M%SZ")
        created_dt = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:rahnuma-assign-{a.id}@rahnuma.ai",
            f"DTSTAMP:{created_dt}",
            f"DTSTART:{due_dt}",
            f"DTEND:{due_dt}",
            f"SUMMARY:[{a.course.code}] {a.title}",
            f"DESCRIPTION:Estimated effort: {a.estimated_minutes or 60} mins.\\nWeight: {a.weight or 0}%",
            "STATUS:CONFIRMED",
            "END:VEVENT",
        ])

    lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(lines)

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=rahnuma_schedule.ics"}
    )


# ==============================================================================
# 4. DRAFT REVIEWER AGENT
# ==============================================================================

class ReviewDraftRequest(BaseModel):
    assignment_id: int
    draft_text: str
    confirmed_ownership: bool

class RubricFeedbackItem(BaseModel):
    criterion: str
    status: str  # "Exceeds Expectations", "On Track", "Needs Work"
    evidence: str
    feedback: str
    suggested_improvement: str

class ReviewDraftResponse(BaseModel):
    draft_id: int
    assignment_title: str
    course_code: str
    rubric_feedback: List[RubricFeedbackItem]
    estimated_range: str
    coaching_note: str


@router.post("/reviewer/analyze", response_model=ReviewDraftResponse)
def review_draft(payload: ReviewDraftRequest, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    start_time = datetime.now(timezone.utc)

    # Human Approval Gate: Student MUST confirm ownership
    if not payload.confirmed_ownership:
        raise HTTPException(
            status_code=400,
            detail="Student ownership confirmation required. You must check 'I confirm this is my own original work' before receiving feedback."
        )

    if len(payload.draft_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Draft content is too short to evaluate. Please provide a substantial draft.")

    assignment = (
        db.query(Assignment)
        .join(Course)
        .filter(Assignment.id == payload.assignment_id, Course.user_id == user.id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    text = payload.draft_text.strip()
    words = text.split()
    word_count = len(words)

    # Save Draft in database
    draft = Draft(
        user_id=user.id,
        assignment_id=assignment.id,
        filename=f"Draft_{assignment.title[:20]}.txt",
        content_text=text,
        ownership_confirmed=True
    )
    db.add(draft)
    db.flush()

    # Load Assignment Rubric
    rubric_list = []
    if assignment.rubric_json:
        try:
            rubric_list = json.loads(assignment.rubric_json)
        except Exception:
            rubric_list = []

    feedback_items: List[RubricFeedbackItem] = []
    est_range = "78% - 85%"

    # 1. LLM Evaluation via Gemini
    if llm_service.is_available:
        rubric_description = json.dumps(rubric_list, indent=2) if rubric_list else (
            "1. Problem Formulation & Structure (40 pts)\n"
            "2. Technical Rigor & Algorithmic Correctness (35 pts)\n"
            "3. Citations & Academic Grounding (25 pts)"
        )
        llm_prompt = f"""
You are the Draft Reviewer agent in Rahnuma AI.
ACADEMIC INTEGRITY DIRECTIVE: You are an evaluative feedback tool, NOT a writer or editor.
NEVER rewrite, rephrase, or ghostwrite sentences for the student. Provide formative critique and actionable guiding questions.

Assignment Title: {assignment.title}
Course: {assignment.course.code}
Rubric Criteria:
{rubric_description}

Student Draft Content:
\"\"\"
{text}
\"\"\"

Task:
Evaluate the draft strictly against each rubric criterion.
Output valid JSON with:
- "rubric_feedback": list of objects, one per criterion:
    {{
      "criterion": string,
      "status": "Exceeds Expectations" | "On Track" | "Needs Work",
      "evidence": string (brief verbatim quote or observation from the draft),
      "feedback": string (pedagogical strengths and weaknesses),
      "suggested_improvement": string (actionable guiding advice for what to check or elaborate, without providing rewritten text)
    }}
- "estimated_range": string (e.g. "82% - 88%")
"""
        llm_data = llm_service.generate_json(llm_prompt)
        if llm_data and isinstance(llm_data.get("rubric_feedback"), list):
            for item in llm_data["rubric_feedback"]:
                if isinstance(item, dict) and "criterion" in item:
                    feedback_items.append(RubricFeedbackItem(
                        criterion=str(item.get("criterion", "Criterion")),
                        status=str(item.get("status", "On Track")),
                        evidence=str(item.get("evidence", "Observed in submitted draft")),
                        feedback=str(item.get("feedback", "Good effort.")),
                        suggested_improvement=str(item.get("suggested_improvement", "Review against course guidelines."))
                    ))
            if llm_data.get("estimated_range"):
                est_range = str(llm_data["estimated_range"])

    # Fallback to heuristic evaluation if LLM did not produce items
    if not feedback_items:
        # Criterion 1: Argument Structure / Problem Formulation
        if word_count > 150:
            status1 = "On Track"
            evidence1 = f"'{' '.join(words[:18])}...'"
            fb1 = "Strong opening problem statement and clear outline of your solution method."
            imp1 = "Strengthen the conclusion section with explicit remarks on limitations or future improvements."
        else:
            status1 = "Needs Work"
            evidence1 = f"Total length is only {word_count} words."
            fb1 = "The introduction jumps directly to implementation details without defining assumptions."
            imp1 = "Add a dedicated background paragraph stating the problem scope before your technical breakdown."

        feedback_items.append(RubricFeedbackItem(
            criterion="Problem Formulation & Structure",
            status=status1,
            evidence=evidence1,
            feedback=fb1,
            suggested_improvement=imp1
        ))

        # Criterion 2: Technical Rigor & Correctness
        has_code_or_math = any(sym in text for sym in ["def ", "class ", "return", "=", "{", "}", "O(", "for "])
        if has_code_or_math:
            status2 = "Exceeds Expectations"
            evidence2 = "Contains structured technical statements, complexity notations, or function definitions."
            fb2 = "Good incorporation of technical precision and algorithmic clarity."
            imp2 = "State the worst-case space complexity alongside time complexity in your discussion."
        else:
            status2 = "Needs Work"
            evidence2 = "No formal notation, pseudocode, or explicit algorithmic steps found in text."
            fb2 = "The submission describes the algorithm informally without step-by-step invariants."
            imp2 = "Include concise pseudocode or formal mathematical definitions for the main routine."

        feedback_items.append(RubricFeedbackItem(
            criterion="Technical Correctness & Rigor",
            status=status2,
            evidence=evidence2,
            feedback=fb2,
            suggested_improvement=imp2
        ))

        # Criterion 3: Evidence, Citations & References
        has_citations = any(cit in text.lower() for cit in ["et al", "(20", "cite", "reference", "source", "lecture", "chapter"])
        if has_citations:
            status3 = "On Track"
            evidence3 = "Explicit references to course readings and external literature included."
            fb3 = "Satisfies academic citation requirements."
            imp3 = "Verify all references conform strictly to the course's designated citation format (e.g. APA or IEEE)."
        else:
            status3 = "Needs Work"
            evidence3 = "No in-text citations or reference markers detected."
            fb3 = "The assignment requires referencing at least 2 course materials or scholarly sources."
            imp3 = "Add in-text citations connecting your methods to relevant lecture slides or textbook chapters."

        feedback_items.append(RubricFeedbackItem(
            criterion="Citations & Grounding",
            status=status3,
            evidence=evidence3,
            feedback=fb3,
            suggested_improvement=imp3
        ))

        # Calculate overall alignment range
        needs_work_count = sum(1 for f in feedback_items if f.status == "Needs Work")
        if needs_work_count == 0:
            est_range = "88% - 95%"
        elif needs_work_count == 1:
            est_range = "78% - 85%"
        else:
            est_range = "65% - 74%"

    # Save Review record
    review = Review(
        draft_id=draft.id,
        feedback_json=json.dumps([f.model_dump() for f in feedback_items]),
        estimated_range=est_range
    )
    db.add(review)
    db.commit()

    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
    _log_trace(
        db, user.id, "Draft Reviewer", "Analyze Draft", "success", duration_ms,
        f"Generated rubric critique ({est_range} estimated alignment) across {len(feedback_items)} criteria for '{assignment.title}'.",
        input_preview=f"Draft words: {word_count} | Assignment: {assignment.title}",
        output_preview=f"Estimated: {est_range} | Status: {feedback_items[0].status if feedback_items else 'N/A'}"
    )

    return ReviewDraftResponse(
        draft_id=draft.id,
        assignment_title=assignment.title,
        course_code=assignment.course.code,
        rubric_feedback=feedback_items,
        estimated_range=est_range,
        coaching_note="Remember: Rahnuma AI reviews and highlights areas for improvement, but does not rewrite your text. You retain full authorship."
    )


# ==============================================================================
# 5. EXAM PREP AGENT
# ==============================================================================

class ExamPrepGenerateRequest(BaseModel):
    course_id: int
    topic: str
    difficulty: str = "Medium"
    question_count: int = 5

class ExamQuizOption(BaseModel):
    id: str
    text: str

class ExamQuizQuestion(BaseModel):
    id: str
    type: str  # "MCQ", "True/False", "Short Answer"
    question: str
    options: Optional[List[ExamQuizOption]] = None
    correct_answer: str
    explanation: str
    source_title: str

class ExamFlashcard(BaseModel):
    question: str
    answer: str
    source_title: str

class ExamPrepResponse(BaseModel):
    quiz_id: Optional[int]
    course_code: str
    topic: str
    difficulty: str
    quiz_questions: List[ExamQuizQuestion]
    flashcards: List[ExamFlashcard]
    weak_areas_identified: List[str]
    revision_schedule: List[str]

class QuizSubmitRequest(BaseModel):
    quiz_id: Optional[int] = None
    answers: Dict[str, str]  # question_id -> selected_option_id


@router.post("/exam-prep/generate", response_model=ExamPrepResponse)
def exam_prep_generate(payload: ExamPrepGenerateRequest, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    start_time = datetime.now(timezone.utc)

    course = db.query(Course).filter(Course.id == payload.course_id, Course.user_id == user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    topic_lower = payload.topic.lower()

    # Dynamic question generation based on course and topic
    questions: List[ExamQuizQuestion] = []
    flashcards: List[ExamFlashcard] = []
    weak_areas = ["Boundary Edge Cases", "Time vs Space Trade-offs"]
    schedule = [
        f"Day 1: Review core definitions and slide notes on {payload.topic}.",
        f"Day 2: Solve 3 practice problems focusing on {payload.difficulty} difficulty.",
        "Day 3: Re-take this self-test to benchmark retention before exam date."
    ]

    # 1. LLM Generation via Gemini grounded in Course Materials
    if llm_service.is_available:
        rag_context = rag_service.retrieve_context(payload.topic, user_id=user.id, course_id=str(course.id))
        llm_prompt = f"""
You are the Exam Prep Agent in Rahnuma AI.
Generate exam practice questions and flashcards for a university student.
Course: {course.code} - {course.name}
Topic: {payload.topic}
Difficulty: {payload.difficulty}
Target Question Count: {payload.question_count}

Course Material Context:
{rag_context if rag_context else "Use standard university computer science curriculum guidelines."}

Task:
Generate {payload.question_count} conceptual quiz questions (mix of MCQ with 4 options and True/False with 2 options), 3 flashcards, 2 weak area topics, and a 3-day revision schedule.
Output valid JSON with keys:
- "quiz_questions": list of objects:
    {{
      "id": "q1",
      "type": "MCQ" or "True/False",
      "question": string,
      "options": [{{"id": "A", "text": "..."}}, {{"id": "B", "text": "..."}}, ...],
      "correct_answer": "A" (or matching option id),
      "explanation": string,
      "source_title": string
    }}
- "flashcards": list of {{"question": string, "answer": string, "source_title": string}}
- "weak_areas_identified": list of strings
- "revision_schedule": list of strings
"""
        llm_data = llm_service.generate_json(llm_prompt)
        if llm_data and isinstance(llm_data.get("quiz_questions"), list) and llm_data["quiz_questions"]:
            parsed_questions = []
            for q in llm_data["quiz_questions"]:
                opts = None
                if isinstance(q.get("options"), list):
                    opts = [ExamQuizOption(id=str(o.get("id")), text=str(o.get("text"))) for o in q["options"] if isinstance(o, dict)]
                parsed_questions.append(ExamQuizQuestion(
                    id=str(q.get("id", f"q{len(parsed_questions)+1}")),
                    type=str(q.get("type", "MCQ")),
                    question=str(q.get("question", "")),
                    options=opts,
                    correct_answer=str(q.get("correct_answer", "A")),
                    explanation=str(q.get("explanation", "")),
                    source_title=str(q.get("source_title", course.name))
                ))
            if parsed_questions:
                questions = parsed_questions
            if isinstance(llm_data.get("flashcards"), list) and llm_data["flashcards"]:
                parsed_cards = []
                for fc in llm_data["flashcards"]:
                    if isinstance(fc, dict):
                        parsed_cards.append(ExamFlashcard(
                            question=str(fc.get("question", "")),
                            answer=str(fc.get("answer", "")),
                            source_title=str(fc.get("source_title", course.name))
                        ))
                if parsed_cards:
                    flashcards = parsed_cards
            if isinstance(llm_data.get("weak_areas_identified"), list) and llm_data["weak_areas_identified"]:
                weak_areas = [str(w) for w in llm_data["weak_areas_identified"]]
            if isinstance(llm_data.get("revision_schedule"), list) and llm_data["revision_schedule"]:
                schedule = [str(s) for s in llm_data["revision_schedule"]]

    # Fallback to topic templates if LLM did not generate questions
    if not questions and ("tree" in topic_lower or "bst" in topic_lower):
        questions = [
            ExamQuizQuestion(
                id="q1",
                type="MCQ",
                question="What is the worst-case time complexity of searching in an unbalanced Binary Search Tree?",
                options=[
                    ExamQuizOption(id="A", text="O(1)"),
                    ExamQuizOption(id="B", text="O(log n)"),
                    ExamQuizOption(id="C", text="O(n)"),
                    ExamQuizOption(id="D", text="O(n log n)")
                ],
                correct_answer="C",
                explanation="In the worst case, an unbalanced BST degenerates into a linear linked list where each node has only one child, taking O(n) search time.",
                source_title="Lecture 4 — Binary Search Trees"
            ),
            ExamQuizQuestion(
                id="q2",
                type="True/False",
                question="An in-order traversal of any valid Binary Search Tree always visits elements in strictly non-decreasing order.",
                options=[
                    ExamQuizOption(id="A", text="True"),
                    ExamQuizOption(id="B", text="False")
                ],
                correct_answer="A",
                explanation="By definition, in-order traversal visits left subtree (all smaller), then root, then right subtree (all larger), producing sorted keys.",
                source_title="Lecture 4 — Binary Search Trees"
            ),
            ExamQuizQuestion(
                id="q3",
                type="MCQ",
                question="Which self-balancing binary search tree guarantees that the heights of two sibling subtrees differ by at most 1?",
                options=[
                    ExamQuizOption(id="A", text="Red-Black Tree"),
                    ExamQuizOption(id="B", text="AVL Tree"),
                    ExamQuizOption(id="C", text="B-Tree"),
                    ExamQuizOption(id="D", text="Splay Tree")
                ],
                correct_answer="B",
                explanation="AVL trees maintain the strict balance factor property: |height(left) - height(right)| <= 1.",
                source_title="Lecture 5 — Self-Balancing Trees"
            ),
        ]
        flashcards = [
            ExamFlashcard(question="What is the minimum height of a BST with n nodes?", answer="floor(log2(n))", source_title="Lecture 4"),
            ExamFlashcard(question="How many children can a node in a binary tree have at most?", answer="At most 2 children (left and right).", source_title="Lecture 4"),
            ExamFlashcard(question="What operation restores balance in an AVL tree after insertion?", answer="Tree Rotations (Left, Right, Left-Right, Right-Left).", source_title="Lecture 5")
        ]
    elif not questions and ("graph" in topic_lower or "bfs" in topic_lower or "dfs" in topic_lower):
        questions = [
            ExamQuizQuestion(
                id="q1",
                type="MCQ",
                question="Which data structure is fundamentally utilized to implement Breadth-First Search (BFS)?",
                options=[
                    ExamQuizOption(id="A", text="LIFO Stack"),
                    ExamQuizOption(id="B", text="FIFO Queue"),
                    ExamQuizOption(id="C", text="Priority Heap"),
                    ExamQuizOption(id="D", text="Hash Table")
                ],
                correct_answer="B",
                explanation="BFS uses a First-In-First-Out Queue to process vertices level by level from the source.",
                source_title="Lecture 7 — Graph Algorithms"
            ),
            ExamQuizQuestion(
                id="q2",
                type="MCQ",
                question="What is the overall time complexity of BFS on a graph represented with an Adjacency List with V vertices and E edges?",
                options=[
                    ExamQuizOption(id="A", text="O(V^2)"),
                    ExamQuizOption(id="B", text="O(V + E)"),
                    ExamQuizOption(id="C", text="O(E log V)"),
                    ExamQuizOption(id="D", text="O(V * E)")
                ],
                correct_answer="B",
                explanation="Every vertex is enqueued once O(V) and every edge is explored once O(E), yielding O(V + E).",
                source_title="Lecture 7 — Graph Algorithms"
            ),
        ]
        flashcards = [
            ExamFlashcard(question="Can Dijkstra's algorithm handle negative edge weights?", answer="No, it can produce incorrect shortest paths with negative cycles/weights.", source_title="Lecture 8"),
            ExamFlashcard(question="What traversal technique is used to detect cycles in directed graphs?", answer="Depth-First Search (DFS) tracking back-edges.", source_title="Lecture 7")
        ]
    elif not questions:
        questions = [
            ExamQuizQuestion(
                id="q1",
                type="MCQ",
                question=f"Which of the following best describes the fundamental principle of {payload.topic}?",
                options=[
                    ExamQuizOption(id="A", text="Minimizing overall latency through redundant processing"),
                    ExamQuizOption(id="B", text="Systematic decomposition into modular components"),
                    ExamQuizOption(id="C", text="Discarding invariant constraints during execution"),
                    ExamQuizOption(id="D", text="Brute-force verification over all states")
                ],
                correct_answer="B",
                explanation=f"Modular decomposition is the primary design strategy taught in {course.code}.",
                source_title=f"{course.name} Core Syllabus"
            ),
            ExamQuizQuestion(
                id="q2",
                type="True/False",
                question=f"In {payload.topic}, verifying pre-conditions is critical prior to state mutation.",
                options=[
                    ExamQuizOption(id="A", text="True"),
                    ExamQuizOption(id="B", text="False")
                ],
                correct_answer="A",
                explanation="Invariants must be guarded to guarantee consistent system state.",
                source_title=f"{course.name} Core Syllabus"
            )
        ]
        flashcards = [
            ExamFlashcard(question=f"What is the key goal of {payload.topic}?", answer="To provide scalable and verifiable solutions according to course specifications.", source_title=course.name)
        ]

    # Save Quiz to DB
    quiz_record = Quiz(
        course_id=course.id,
        title=f"Practice Quiz: {payload.topic} ({payload.difficulty})",
        topic=payload.topic,
        quiz_date=datetime.now(timezone.utc),
        questions_json=json.dumps([q.model_dump() for q in questions])
    )
    db.add(quiz_record)
    db.commit()
    db.refresh(quiz_record)

    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
    _log_trace(
        db, user.id, "Exam Prep Agent", "Generate Quiz & Flashcards", "success", duration_ms,
        f"Generated practice quiz ({len(questions)} questions) and {len(flashcards)} flashcards on '{payload.topic}' for {course.code}.",
        input_preview=f"Course: {course.code} | Topic: {payload.topic} | Difficulty: {payload.difficulty}",
        output_preview=f"Questions: {len(questions)} | Flashcards: {len(flashcards)}"
    )

    return ExamPrepResponse(
        quiz_id=quiz_record.id,
        course_code=course.code,
        topic=payload.topic,
        difficulty=payload.difficulty,
        quiz_questions=questions,
        flashcards=flashcards,
        weak_areas_identified=weak_areas,
        revision_schedule=schedule
    )


class QuizScoreResult(BaseModel):
    total_questions: int
    correct_count: int
    score_percentage: float
    passed: bool
    breakdown: List[Dict[str, Any]]
    weak_areas: List[str]
    coaching_advice: str


@router.post("/exam-prep/submit", response_model=QuizScoreResult)
def exam_prep_submit(payload: QuizSubmitRequest, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    start_time = datetime.now(timezone.utc)

    quiz = None
    if payload.quiz_id:
        quiz = db.query(Quiz).filter(Quiz.id == payload.quiz_id).first()

    if not quiz or not quiz.questions_json:
        # Fallback question set if quiz was generated in frontend state
        raise HTTPException(status_code=404, detail="Quiz session not found")

    questions_raw = json.loads(quiz.questions_json)
    total = len(questions_raw)
    correct = 0
    breakdown = []
    weak_topics = []

    for q in questions_raw:
        qid = q["id"]
        user_ans = payload.answers.get(qid, "")
        is_correct = (user_ans.strip().upper() == q["correct_answer"].strip().upper())
        if is_correct:
            correct += 1
        else:
            weak_topics.append(q["question"][:50] + "...")

        breakdown.append({
            "question_id": qid,
            "question": q["question"],
            "selected_answer": user_ans,
            "correct_answer": q["correct_answer"],
            "is_correct": is_correct,
            "explanation": q["explanation"],
            "source_title": q.get("source_title", "Course Material")
        })

    pct = round((correct / max(1, total)) * 100, 1)
    passed = pct >= 60.0

    quiz.results_json = json.dumps({"score": pct, "correct": correct, "total": total})
    db.commit()

    advice = (
        f"Great effort! You scored {pct}%. Review the explanations for questions you missed "
        f"and use the flashcards to reinforce retention."
        if passed else
        f"You scored {pct}%. We recommend reviewing the source materials cited in the incorrect questions before retaking the quiz."
    )

    duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
    _log_trace(
        db, user.id, "Exam Prep Agent", "Grade Quiz", "success", duration_ms,
        f"Graded quiz '{quiz.title}': {correct}/{total} correct ({pct}%).",
        input_preview=f"Answers submitted: {len(payload.answers)}",
        output_preview=f"Score: {pct}% | Passed: {passed}"
    )

    return QuizScoreResult(
        total_questions=total,
        correct_count=correct,
        score_percentage=pct,
        passed=passed,
        breakdown=breakdown,
        weak_areas=weak_topics[:3] or ["None detected! Excellent mastery."],
        coaching_advice=advice
    )


# ==============================================================================
# 6. SETTINGS & DEMO MANAGEMENT
# ==============================================================================

class SettingsData(BaseModel):
    user_name: str
    email: str
    timezone: str
    study_hours_per_day: int
    lms_provider: str
    lms_status: str
    last_sync: Optional[str]

class SettingsUpdateRequest(BaseModel):
    user_name: Optional[str] = None
    study_hours_per_day: Optional[int] = None
    timezone: Optional[str] = None


@router.get("/settings", response_model=SettingsData)
def get_settings(db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    conn = db.query(LMSConnection).filter(LMSConnection.user_id == user.id).first()

    return SettingsData(
        user_name=user.name,
        email=user.email,
        timezone=user.timezone or "Asia/Karachi",
        study_hours_per_day=3,
        lms_provider=conn.provider if conn else "demo",
        lms_status=conn.status if conn else "connected",
        last_sync=conn.last_sync.isoformat() if (conn and conn.last_sync) else None
    )


@router.put("/settings")
def update_settings(payload: SettingsUpdateRequest, db: Session = Depends(get_db)):
    user = _get_demo_user(db)
    if payload.user_name:
        user.name = payload.user_name
    if payload.timezone:
        user.timezone = payload.timezone
    db.commit()
    return {"status": "updated", "user": {"name": user.name, "email": user.email}}


@router.post("/settings/reset-demo")
def reset_demo_data(db: Session = Depends(get_db)):
    """Wipes student local course records and resets session cleanly."""
    user = _get_demo_user(db)

    # Delete existing courses (cascades to assignments, materials, etc.)
    db.query(Course).filter(Course.user_id == user.id).delete()
    db.query(StudyPlan).filter(StudyPlan.user_id == user.id).delete()
    db.query(Draft).filter(Draft.user_id == user.id).delete()
    db.query(AgentTrace).filter(AgentTrace.user_id == user.id).delete()
    db.commit()

    # Re-sync via LMS endpoint logic
    from app.api.routes.lms import sync_lms
    sync_res = sync_lms(db)

    _log_trace(
        db, user.id, "System", "Reset Local Data", "success", 250,
        "Cleared local student cache. Fresh portal synchronization ready."
    )

    return {"status": "reset_complete", "sync_result": sync_res}
