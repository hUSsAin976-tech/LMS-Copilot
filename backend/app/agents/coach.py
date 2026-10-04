from sqlalchemy.orm import Session
from datetime import datetime
from app.models.all import AgentTrace
from app.schemas.agents import ConceptCoachResponse, SourceItem
from app.rag.service import RAGService
from typing import Optional

class ConceptCoachAgent:
    def __init__(self, db: Session, user_id: int, rag_service: RAGService):
        self.db = db
        self.user_id = user_id
        self.rag_service = rag_service

    def answer_question(self, question: str, course_id: Optional[str] = None) -> dict:
        start_time = datetime.utcnow()
        
        # 1. Academic Integrity Check
        if "write" in question.lower() and "assignment" in question.lower():
            # Trigger guardrail
            response = ConceptCoachResponse(
                concept="Academic Integrity Guard",
                simple_explanation="I cannot write your assignment for you.",
                course_connection="As per course guidelines, you must submit your own original work.",
                similar_example="I can, however, review an outline or provide a similar example problem if you'd like.",
                common_mistakes="Asking AI to generate final assignments violates academic policies.",
                practice_question="Would you like me to explain the core concepts needed for this assignment instead?",
                sources=[],
                is_academic_integrity_flag=True
            )
            self._log_trace("Answer Question", "blocked", "Blocked ghostwriting request.", start_time)
            return response.dict()

        # 2. RAG Retrieval
        context = self.rag_service.retrieve_context(question, self.user_id, course_id)
        
        # Mock LLM generation using the retrieved context
        response = ConceptCoachResponse(
            concept="Binary Search Trees (BST)",
            simple_explanation="A BST is a node-based binary tree data structure where each node has at most two children, and the left child's value is less than the parent's, while the right child's is greater.",
            course_connection="In CS201 'BST Implementation Guide', we focus on implementing insertion and traversal methods iteratively.",
            similar_example="Imagine sorting a dictionary by splitting it in half repeatedly.",
            common_mistakes="Forgetting to update the root node when the tree is re-balanced or when inserting the first element.",
            practice_question="How would you implement the `find_min()` function in a BST?",
            sources=[
                SourceItem(title="BST Implementation Guide", course="CS201", page_section="Page 4: Insertion")
            ],
            is_academic_integrity_flag=False
        )

        self._log_trace("Answer Question", "success", f"Answered question on {response.concept}", start_time)
        return response.dict()

    def _log_trace(self, action: str, status: str, summary: str, start_time: datetime):
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        trace = AgentTrace(
            user_id=self.user_id,
            agent="Concept Coach",
            action=action,
            status=status,
            duration_ms=duration_ms,
            safe_summary=summary
        )
        self.db.add(trace)
        self.db.commit()
