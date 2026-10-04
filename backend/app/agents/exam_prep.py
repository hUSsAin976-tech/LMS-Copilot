from sqlalchemy.orm import Session
from datetime import datetime
from app.models.all import AgentTrace
from app.schemas.agents import ExamPrepResponse, QuizQuestion, QuizOption, Flashcard
from app.rag.service import RAGService
from typing import Optional

class ExamPrepAgent:
    def __init__(self, db: Session, user_id: int, rag_service: RAGService):
        self.db = db
        self.user_id = user_id
        self.rag_service = rag_service

    def generate_prep_material(self, course_id: str, topic: str, difficulty: str, question_count: int) -> dict:
        start_time = datetime.utcnow()
        
        # 1. RAG Retrieval for grounding
        context = self.rag_service.retrieve_context(topic, self.user_id, course_id)

        # 2. Mock LLM Generation
        response = ExamPrepResponse(
            quiz_questions=[
                QuizQuestion(
                    id="q1",
                    type="MCQ",
                    question="What is the worst-case time complexity for searching a standard Binary Search Tree?",
                    options=[
                        QuizOption(id="A", text="O(1)"),
                        QuizOption(id="B", text="O(log n)"),
                        QuizOption(id="C", text="O(n)"),
                        QuizOption(id="D", text="O(n^2)")
                    ],
                    correct_answer="C",
                    explanation="If the tree is completely unbalanced (like a linked list), the search takes O(n).",
                    source_title="BST Implementation Guide"
                ),
                QuizQuestion(
                    id="q2",
                    type="True/False",
                    question="In a completely balanced BST, the height is O(log n).",
                    options=[
                        QuizOption(id="A", text="True"),
                        QuizOption(id="B", text="False")
                    ],
                    correct_answer="A",
                    explanation="By definition, a balanced BST maintains a height logarithmic to the number of nodes.",
                    source_title="BST Implementation Guide"
                )
            ],
            flashcards=[
                Flashcard(
                    question="What property must every node in a BST satisfy?",
                    answer="Left child's value < Parent's value < Right child's value.",
                    source_title="BST Implementation Guide"
                ),
                Flashcard(
                    question="What traversal method on a BST yields sorted order?",
                    answer="In-order traversal.",
                    source_title="BST Implementation Guide"
                )
            ],
            revision_schedule=[
                "Review unbalanced vs balanced trees (BST) today.",
                "Practice implementing in-order traversal tomorrow."
            ],
            weak_areas_identified=["Tree Balancing Algorithms (e.g., AVL, Red-Black)"]
        )

        self._log_trace("Generate Exam Prep", "success", f"Generated {question_count} questions and flashcards for {topic}", start_time)
        return response.dict()

    def _log_trace(self, action: str, status: str, summary: str, start_time: datetime):
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        trace = AgentTrace(
            user_id=self.user_id,
            agent="Exam Prep Agent",
            action=action,
            status=status,
            duration_ms=duration_ms,
            safe_summary=summary
        )
        self.db.add(trace)
        self.db.commit()
