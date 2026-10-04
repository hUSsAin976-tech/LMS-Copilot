from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseLMSConnector(ABC):
    @abstractmethod
    def connect(self) -> bool:
        pass

    @abstractmethod
    def disconnect(self) -> bool:
        pass

    @abstractmethod
    def get_courses(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_assignments(self, course_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_materials(self, course_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_announcements(self, course_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_quizzes(self, course_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_course_details(self, course_id: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def sync(self) -> Dict[str, Any]:
        pass
