"""
Academic Integrity Guardrails for Rahnuma AI.
Enforces that Rahnuma coaches rather than solves or writes student assignments.
"""
import re
from typing import Tuple, Optional, List

ACADEMIC_INTEGRITY_TRIGGERS: List[str] = [
    "write my assignment",
    "write the assignment",
    "do my homework",
    "write an essay for me",
    "solve my quiz",
    "solve this assignment",
    "write my paper",
    "do my project",
    "give me the complete solution",
    "write my code for",
    "write the full solution",
    "give me all answers",
    "cheat on",
    "take my exam",
    "do this quiz for me",
    "write my final project",
    "give me answer key",
]

SOCRATIC_SYSTEM_PROMPT = """
You are Rahnuma AI, an intelligent, empathetic, and academically rigorous AI learning coach for university students.
Your mission is to guide students to genuine conceptual understanding, not to do the work for them.

CORE ACADEMIC INTEGRITY POLICIES:
1. NEVER produce ready-to-submit answers, essays, code solutions, or homework completions.
2. If asked to complete an assignment, gently refuse the ghostwriting request and redirect to explaining the foundational concept or walking through an analogous, different example.
3. Encourage active learning: ask guiding questions, explain 'why' and 'how', identify common pitfalls, and test their intuition.
4. Ground explanations in the provided course materials whenever available, citing sources precisely.
"""

class AcademicIntegrityGuard:
    @staticmethod
    def inspect(query: str) -> Tuple[bool, Optional[str]]:
        """
        Inspects student query for ghostwriting, full-solution generation,
        or academic dishonesty requests.
        Returns: (is_flagged, refusal_reason)
        """
        normalized = query.lower().strip()
        for trigger in ACADEMIC_INTEGRITY_TRIGGERS:
            if trigger in normalized:
                return (
                    True,
                    f"Academic Integrity Policy: Rahnuma AI cannot produce direct assignment solutions, essays, or code for submission. We are here to coach you through the underlying principles so you master the material yourself."
                )

        # Regex checks for specific phrasing
        patterns = [
            r"\b(write|solve|do)\s+(my|the)\s+(homework|assignment|quiz|exam|project|lab)\b",
            r"\b(give\s+me)\s+(all\s+the\s+answers|the\s+entire\s+code|the\s+complete\s+solution)\b",
        ]
        for pattern in patterns:
            if re.search(pattern, normalized):
                return (
                    True,
                    "Academic Integrity Policy: Direct solution generation or ghostwriting is not permitted. Let's break down the underlying concept instead!"
                )

        return (False, None)
