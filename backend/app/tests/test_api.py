"""
Rahnuma AI — Core System Integration & Acceptance Tests
Tests the full multi-agent pipeline: LMS sync, Intake, Planner, Coach, Reviewer, Exam Prep, Traces.
"""
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import engine


class TestRahnumaAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def test_01_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")

    def test_02_lms_sync(self):
        res = self.client.post("/api/lms/sync")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")

    def test_03_dashboard_data(self):
        res = self.client.get("/api/dashboard")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("user", data)
        self.assertGreater(data["course_count"], 0)
        self.assertIsInstance(data["upcoming_deadlines"], list)

    def test_04_courses_and_detail(self):
        res = self.client.get("/api/courses")
        self.assertEqual(res.status_code, 200)
        courses = res.json()
        self.assertGreater(len(courses), 0)
        first_course_id = courses[0]["id"]

        detail_res = self.client.get(f"/api/courses/{first_course_id}")
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()
        self.assertEqual(detail["id"], first_course_id)
        self.assertIn("assignments", detail)
        self.assertIn("materials", detail)

    def test_05_intake_extraction_and_confirmation(self):
        assignments_res = self.client.get("/api/assignments")
        self.assertEqual(assignments_res.status_code, 200)
        assignments = assignments_res.json()
        self.assertGreater(len(assignments), 0)
        target = assignments[0]

        # Extract
        extract_res = self.client.post("/api/intake/extract", json={
            "assignment_id": target["id"]
        })
        self.assertEqual(extract_res.status_code, 200)
        extracted = extract_res.json()
        self.assertIn("requirements", extracted)
        self.assertIn("rubric", extracted)

        # Confirm
        confirm_res = self.client.post("/api/intake/confirm", json={
            "assignment_id": target["id"],
            "title": extracted["title"],
            "due_at": extracted["due_at"],
            "estimated_minutes": extracted["estimated_minutes"],
            "requirements": extracted["requirements"],
            "rubric": extracted["rubric"]
        })
        self.assertEqual(confirm_res.status_code, 200)
        self.assertEqual(confirm_res.json()["status"], "confirmed")

    def test_06_planner_generation_and_ics(self):
        res = self.client.post("/api/planner/generate", json={"daily_availability_hours": 3})
        self.assertEqual(res.status_code, 200)
        plan = res.json()
        self.assertEqual(len(plan["days"]), 7)
        self.assertIn("reasoning_summary", plan)

        # Export ICS
        ics_res = self.client.get("/api/planner/export-ics")
        self.assertEqual(ics_res.status_code, 200)
        self.assertIn("BEGIN:VCALENDAR", ics_res.text)

    def test_07_concept_coach_grounding(self):
        res = self.client.post("/api/coach/chat", json={
            "query": "Explain binary search tree and traversal"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["is_academic_integrity_flag"])
        self.assertIn("concept", data)
        self.assertGreater(len(data["sources"]), 0)

    def test_08_academic_integrity_guardrail(self):
        # Ghostwriting query MUST be blocked
        res = self.client.post("/api/coach/chat", json={
            "query": "write my assignment for me and give me the solution"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_academic_integrity_flag"])
        self.assertIn("coach, not a ghostwriter", data["simple_explanation"].lower())

    def test_09_draft_reviewer_gate_and_analysis(self):
        assignments_res = self.client.get("/api/assignments")
        target_id = assignments_res.json()[0]["id"]

        # Without ownership verification: MUST fail with 400
        fail_res = self.client.post("/api/reviewer/analyze", json={
            "assignment_id": target_id,
            "draft_text": "Sample student draft text exploring binary search trees...",
            "confirmed_ownership": False
        })
        self.assertEqual(fail_res.status_code, 400)

        # With ownership verification: Succeeds
        success_res = self.client.post("/api/reviewer/analyze", json={
            "assignment_id": target_id,
            "draft_text": (
                "In this assignment, we examine the construction and traversal of a Binary Search Tree (BST). "
                "The fundamental invariant requires that for each node, all keys in the left subtree are strictly smaller, "
                "and all keys in the right subtree are strictly greater. We implemented in-order traversal with O(n) complexity. "
                "As referenced in Lecture 4 (Sedgewick, Algorithms 4th Ed.), balanced BSTs guarantee O(log n) height."
            ),
            "confirmed_ownership": True
        })
        self.assertEqual(success_res.status_code, 200)
        review = success_res.json()
        self.assertIn("rubric_feedback", review)
        self.assertIn("estimated_range", review)

    def test_10_exam_prep_generation_and_grading(self):
        courses_res = self.client.get("/api/courses")
        course_id = courses_res.json()[0]["id"]

        gen_res = self.client.post("/api/exam-prep/generate", json={
            "course_id": course_id,
            "topic": "Binary Search Trees",
            "difficulty": "Medium",
            "question_count": 3
        })
        self.assertEqual(gen_res.status_code, 200)
        prep = gen_res.json()
        self.assertGreater(len(prep["quiz_questions"]), 0)
        self.assertGreater(len(prep["flashcards"]), 0)

        # Submit answers
        first_q = prep["quiz_questions"][0]
        sub_res = self.client.post("/api/exam-prep/submit", json={
            "quiz_id": prep["quiz_id"],
            "answers": {first_q["id"]: first_q["correct_answer"]}
        })
        self.assertEqual(sub_res.status_code, 200)
        result = sub_res.json()
        self.assertIn("score_percentage", result)

    def test_11_agent_traces_logged(self):
        res = self.client.get("/api/traces")
        self.assertEqual(res.status_code, 200)
        traces = res.json()
        self.assertGreater(len(traces), 0)
        agents = {t["agent"] for t in traces}
        self.assertTrue("Fahmly" in agents or "Concept Coach" in agents or "Planner Agent" in agents)


if __name__ == "__main__":
    unittest.main()
