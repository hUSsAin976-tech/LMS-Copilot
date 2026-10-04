from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Intake Agent Schemas
class RubricItem(BaseModel):
    criterion: str
    points: int
    description: str

class ExtractedAssignment(BaseModel):
    title: str
    deadline: Optional[datetime]
    requirements: List[str]
    format: Optional[str]
    weight: Optional[int]
    estimated_minutes: int = 120
    rubric: List[RubricItem] = []
    constraints: List[str] = []
    citation_requirements: List[str] = []

# Planner Agent Schemas
class DailyTask(BaseModel):
    assignment_id: str
    title: str
    allocated_minutes: int

class DailyPlan(BaseModel):
    date: str
    tasks: List[DailyTask]
    total_minutes: int

class PlannerOutput(BaseModel):
    plan: List[DailyPlan]
    conflicts: List[str]
    warnings: List[str]
    reasoning_summary: str

# Concept Coach Schemas
class SourceItem(BaseModel):
    title: str
    course: str
    page_section: Optional[str]

class ConceptCoachResponse(BaseModel):
    concept: str
    simple_explanation: str
    course_connection: str
    similar_example: str
    common_mistakes: str
    practice_question: str
    sources: List[SourceItem]
    is_academic_integrity_flag: bool = False

# Draft Reviewer Schemas
class ReviewFeedback(BaseModel):
    criterion: str
    status: str # "Needs Work", "On Track", "Excellent"
    evidence: str
    feedback: str
    suggested_improvement: str

class ReviewerResponse(BaseModel):
    rubric_feedback: List[ReviewFeedback]
    estimated_range: Optional[str]

# Exam Prep Schemas
class QuizOption(BaseModel):
    id: str
    text: str

class QuizQuestion(BaseModel):
    id: str
    type: str # "MCQ", "True/False", "Short Answer"
    question: str
    options: Optional[List[QuizOption]] = None
    correct_answer: str
    explanation: str
    source_title: str

class Flashcard(BaseModel):
    question: str
    answer: str
    source_title: str

class ExamPrepResponse(BaseModel):
    quiz_questions: List[QuizQuestion]
    flashcards: List[Flashcard]
    revision_schedule: List[str]
    weak_areas_identified: List[str]
