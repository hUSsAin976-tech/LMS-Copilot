from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict
from app.models.all import AgentTrace
from app.schemas.agents import PlannerOutput, DailyPlan, DailyTask

class PlannerAgent:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id

    def generate_plan(self, assignments: List[Dict], availability_hours_per_day: int = 3) -> dict:
        start_time = datetime.utcnow()
        
        # Mock Planner Logic
        # In reality, this would use an LLM or constraint solver to distribute `estimated_minutes` 
        # across available days before deadlines.
        
        plan = [
            DailyPlan(
                date="2026-10-10",
                tasks=[
                    DailyTask(assignment_id="a1", title="Hello World in Python", allocated_minutes=60),
                ],
                total_minutes=60
            ),
            DailyPlan(
                date="2026-10-11",
                tasks=[
                    DailyTask(assignment_id="a2", title="Loops and Conditionals", allocated_minutes=120)
                ],
                total_minutes=120
            )
        ]

        conflicts = ["Oct 12 has 2 overlapping assignments due at midnight."]
        warnings = ["You are scheduled for 4 hours of study on Oct 11, which exceeds your typical daily limit."]
        reasoning = "I prioritized the Python assignment since it's due soonest, and allocated heavy study time for the weekend to avoid deadline overlap next week."

        output = PlannerOutput(
            plan=plan,
            conflicts=conflicts,
            warnings=warnings,
            reasoning_summary=reasoning
        )

        self._log_trace(
            action="Generate Plan",
            status="success",
            summary="Generated 2-day study plan and identified 1 conflict.",
            start_time=start_time
        )

        return output.dict()

    def _log_trace(self, action: str, status: str, summary: str, start_time: datetime):
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        trace = AgentTrace(
            user_id=self.user_id,
            agent="Planner",
            action=action,
            status=status,
            duration_ms=duration_ms,
            safe_summary=summary
        )
        self.db.add(trace)
        self.db.commit()
