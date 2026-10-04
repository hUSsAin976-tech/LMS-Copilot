from sqlalchemy.orm import Session
from datetime import datetime
from app.models.all import AgentTrace
from app.schemas.agents import ExtractedAssignment
import json

class IntakeAgent:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id

    def extract_requirements(self, text_content: str) -> dict:
        """
        Simulates an LLM call to extract structured data from assignment text.
        In production, this uses Gemini with Instructor/structured outputs.
        """
        start_time = datetime.utcnow()
        
        # Mock LLM Extraction
        extracted_data = ExtractedAssignment(
            title="Extracted from text",
            deadline=datetime.utcnow(),
            requirements=["Must be 5 pages long", "Include 3 peer-reviewed sources"],
            format="PDF",
            weight=10,
            estimated_minutes=180,
            rubric=[],
            constraints=["No late submissions accepted"],
            citation_requirements=["APA format"]
        )

        self._log_trace(
            action="Extract Requirements",
            status="success",
            summary="Extracted 2 requirements, 1 constraint, and estimated 180 minutes of effort.",
            start_time=start_time
        )

        return extracted_data.dict()

    def _log_trace(self, action: str, status: str, summary: str, start_time: datetime):
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        trace = AgentTrace(
            user_id=self.user_id,
            agent="Intake",
            action=action,
            status=status,
            duration_ms=duration_ms,
            safe_summary=summary
        )
        self.db.add(trace)
        self.db.commit()
