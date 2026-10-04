"""
Unit tests for Rahnuma AI Notifications API.
Tests retrieval, auto-population, mark-read, mark-all-read, and deletion.
"""
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.all import User, Notification


class TestNotificationsAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Ensure active student exists
        user = cls.db.query(User).first()
        if not user:
            user = User(name="Test Student", email="student@nu.edu.pk")
            cls.db.add(user)
            cls.db.commit()
            cls.db.refresh(user)
        cls.user = user

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_get_notifications(self):
        res = self.client.get("/api/notifications")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        first = data[0]
        self.assertIn("id", first)
        self.assertIn("title", first)
        self.assertIn("message", first)
        self.assertIn("read", first)

    def test_02_create_and_mark_read(self):
        # Create
        create_res = self.client.post(
            "/api/notifications",
            json={
                "type": "agent",
                "title": "Test Agent Notification",
                "message": "Automated test notification content",
                "link": "/coach",
            },
        )
        self.assertEqual(create_res.status_code, 201)
        created = create_res.json()
        notif_id = created["id"]
        self.assertFalse(created["read"])

        # Mark read
        read_res = self.client.put(f"/api/notifications/{notif_id}/read")
        self.assertEqual(read_res.status_code, 200)
        updated = read_res.json()
        self.assertTrue(updated["read"])

    def test_03_mark_all_read(self):
        res = self.client.put("/api/notifications/read-all")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")

        # Verify all are read
        list_res = self.client.get("/api/notifications")
        for item in list_res.json():
            self.assertTrue(item["read"])

    def test_04_delete_notification(self):
        # Create one to delete
        create_res = self.client.post(
            "/api/notifications",
            json={
                "type": "system",
                "title": "Temporary Notification",
                "message": "Will be deleted",
            },
        )
        notif_id = create_res.json()["id"]

        del_res = self.client.delete(f"/api/notifications/{notif_id}")
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(del_res.json()["status"], "deleted")


if __name__ == "__main__":
    unittest.main()
