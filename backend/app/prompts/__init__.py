"""
Rahnuma AI Prompt Templates Package
Centralized prompts and templates for all 5 core AI agents:
- Concept Coach
- Intake Agent
- Planner Agent
- Draft Reviewer
- Exam Prep Studio
"""

from app.prompts.coach import COACH_SYSTEM_PROMPT, COACH_EXPLANATION_TEMPLATE
from app.prompts.intake import INTAKE_SYSTEM_PROMPT, INTAKE_EXTRACTION_TEMPLATE
from app.prompts.planner import PLANNER_SYSTEM_PROMPT, PLANNER_SYNTHESIS_TEMPLATE
from app.prompts.reviewer import REVIEWER_SYSTEM_PROMPT, REVIEWER_ANALYSIS_TEMPLATE
from app.prompts.exam_prep import EXAM_PREP_SYSTEM_PROMPT, EXAM_PREP_GENERATE_TEMPLATE

__all__ = [
    "COACH_SYSTEM_PROMPT",
    "COACH_EXPLANATION_TEMPLATE",
    "INTAKE_SYSTEM_PROMPT",
    "INTAKE_EXTRACTION_TEMPLATE",
    "PLANNER_SYSTEM_PROMPT",
    "PLANNER_SYNTHESIS_TEMPLATE",
    "REVIEWER_SYSTEM_PROMPT",
    "REVIEWER_ANALYSIS_TEMPLATE",
    "EXAM_PREP_SYSTEM_PROMPT",
    "EXAM_PREP_GENERATE_TEMPLATE",
]
