"""
Unit and integration tests for Rahnuma AI's AI services, RAG vector retrieval,
and Academic Integrity Guardrails.
"""
import unittest
from app.core.guardrails import AcademicIntegrityGuard
from app.rag.service import rag_service
from app.services.llm import llm_service


class TestAIAndRAGServices(unittest.TestCase):
    def test_guardrails_blocks_ghostwriting(self):
        blocked_queries = [
            "Write my assignment on binary search trees",
            "Please do my homework for CS201",
            "Solve this assignment for me please",
            "Write an essay for me on database normalization",
            "Give me the complete solution to lab 3",
            "Write my code for Dijkstra algorithm",
        ]
        for q in blocked_queries:
            flagged, reason = AcademicIntegrityGuard.inspect(q)
            self.assertTrue(flagged, f"Expected query to be flagged: {q}")
            self.assertIsNotNone(reason)

    def test_guardrails_allows_conceptual_queries(self):
        allowed_queries = [
            "What is a binary search tree?",
            "Can you explain the difference between BFS and DFS?",
            "Show me an analogous example of the chain rule in calculus",
            "What are common pitfalls when normalizing a database to 3NF?",
            "Give me a practice question on Dijkstra's algorithm",
            "Review my outline for the algorithms project",
        ]
        for q in allowed_queries:
            flagged, reason = AcademicIntegrityGuard.inspect(q)
            self.assertFalse(flagged, f"Expected query to be allowed: {q}")
            self.assertIsNone(reason)

    def test_rag_service_chunk_and_retrieval(self):
        sample_doc = (
            "A Binary Search Tree (BST) is an ordered tree data structure. "
            "In an in-order traversal of a binary search tree, the nodes are visited in ascending order. "
            "The worst-case search complexity is O(n) for an unbalanced tree, and O(log n) for a balanced tree."
        )
        # Ingest document into RAG service
        rag_service.ingest_document(
            material_id="test_mat_101",
            course_id="1",
            user_id=1,
            title="BST Lecture Notes",
            text=sample_doc
        )

        # Search for concept
        results = rag_service.search("binary search tree traversal", user_id=1, course_id="1", top_k=2)
        self.assertGreater(len(results), 0)
        self.assertIn("metadata", results[0])
        self.assertEqual(results[0]["metadata"]["title"], "BST Lecture Notes")

        # Context retrieval format
        context = rag_service.retrieve_context("BST traversal", user_id=1, course_id="1")
        self.assertIn("BST Lecture Notes", context)
        self.assertIn("in-order traversal", context)

    def test_llm_service_fallback_or_live(self):
        # Even without GEMINI_API_KEY, llm_service handles calls gracefully without crashing
        self.assertIsNotNone(llm_service)
        # If no key, is_available is false and returns None cleanly
        if not llm_service.is_available:
            text = llm_service.generate_text("Hello")
            self.assertIsNone(text)
            json_res = llm_service.generate_json("Hello")
            self.assertIsNone(json_res)
