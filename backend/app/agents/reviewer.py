from sqlalchemy.orm import Session
from datetime import datetime
from app.models.all import AgentTrace
from app.schemas.agents import ReviewerResponse, ReviewFeedback

class DraftReviewerAgent:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id

    def review_draft(self, assignment_id: str, draft_content: str, confirmed_ownership: bool) -> dict:
        start_time = datetime.utcnow()
        
        if not confirmed_ownership:
            raise ValueError("Student must confirm ownership of the draft.")

        # Mock LLM Rubric Analysis
        feedback = [
            ReviewFeedback(
                criterion="Argument Structure",
                status="On Track",
                evidence="Your thesis statement in paragraph 1 clearly outlines your three main points.",
                feedback="Good job establishing the structure early on.",
                suggested_improvement="Consider making the transition to the second point smoother."
            ),
            ReviewFeedback(
                criterion="Use of Sources",
                status="Needs Work",
                evidence="Only 2 sources were cited, but the requirement is 3.",
                feedback="You are missing one required peer-reviewed source.",
                suggested_improvement="Find one more academic paper supporting your argument in section 3."
            )
        ]

        response = ReviewerResponse(
            rubric_feedback=feedback,
            estimated_range="75% - 85%"
        )

        self._log_trace("Review Draft", "success", "Generated rubric-based feedback for draft.", start_time)
        return response.dict()

    def _log_trace(self, action: str, status: str, summary: str, start_time: datetime):
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        trace = AgentTrace(
            user_id=self.user_id,
            agent="Draft Reviewer",
            action=action,
            status=status,
            duration_ms=duration_ms,
            safe_summary=summary
        )
        self.db.add(trace)
        self.db.commit()
