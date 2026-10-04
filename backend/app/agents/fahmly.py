from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.integrations.lms.base import BaseLMSConnector
from app.models.all import Course, Assignment, Material, Quiz, AgentTrace
from datetime import datetime

class FahmlyAgent:
    def __init__(self, db: Session, lms_connector: BaseLMSConnector, user_id: int):
        self.db = db
        self.lms_connector = lms_connector
        self.user_id = user_id

    def sync(self) -> Dict[str, Any]:
        start_time = datetime.utcnow()
        try:
            # 1. Connect
            self.lms_connector.connect()

            # 2. Fetch and store courses
            lms_courses = self.lms_connector.get_courses()
            for c_data in lms_courses:
                course = self.db.query(Course).filter(
                    Course.lms_course_id == c_data["id"],
                    Course.user_id == self.user_id
                ).first()
                if not course:
                    course = Course(
                        user_id=self.user_id,
                        lms_course_id=c_data["id"],
                        name=c_data["name"],
                        code=c_data["code"],
                        description=c_data["description"]
                    )
                    self.db.add(course)
                    self.db.commit()
                    self.db.refresh(course)

                # 3. Fetch and store assignments
                lms_assignments = self.lms_connector.get_assignments(c_data["id"])
                for a_data in lms_assignments:
                    assignment = self.db.query(Assignment).filter(
                        Assignment.external_id == a_data["id"],
                        Assignment.course_id == course.id
                    ).first()
                    if not assignment:
                        assignment = Assignment(
                            course_id=course.id,
                            external_id=a_data["id"],
                            title=a_data["title"],
                            weight=a_data.get("weight"),
                            estimated_minutes=a_data.get("estimated_minutes")
                        )
                        # We might need to parse due_at string to datetime here based on implementation
                        self.db.add(assignment)
                
                # 4. Fetch and store materials
                lms_materials = self.lms_connector.get_materials(c_data["id"])
                for m_data in lms_materials:
                    material = self.db.query(Material).filter(
                        Material.external_id == m_data["id"],
                        Material.course_id == course.id
                    ).first()
                    if not material:
                        material = Material(
                            course_id=course.id,
                            external_id=m_data["id"],
                            title=m_data["title"],
                            type=m_data["type"],
                            source_url=m_data.get("source_url")
                        )
                        self.db.add(material)
                        # Here we would trigger Material Ingestion -> RAG
                        # ingest_document(material)

            self.db.commit()
            self._log_trace("sync", "success", "Synced courses, assignments, and materials successfully.", start_time)
            return {"status": "success"}

        except Exception as e:
            self.db.rollback()
            self._log_trace("sync", "error", str(e), start_time)
            return {"status": "error", "message": str(e)}

    def _log_trace(self, action: str, status: str, summary: str, start_time: datetime):
        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        trace = AgentTrace(
            user_id=self.user_id,
            agent="Fahmly",
            action=action,
            status=status,
            duration_ms=duration_ms,
            safe_summary=summary
        )
        self.db.add(trace)
        self.db.commit()
