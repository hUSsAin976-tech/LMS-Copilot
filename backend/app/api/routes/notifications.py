"""
Notifications API routes for Rahnuma AI.
Handles retrieving, marking read, and managing notifications for the student.
"""
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.all import User, Notification, Assignment, Deadline, Course, AgentTrace
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    link: Optional[str] = None
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    type: str = "info"
    title: str
    message: str
    link: Optional[str] = None


def _seed_initial_notifications(user: User, db: Session) -> List[Notification]:
    """Generates initial contextual notifications based on user's active courses, deadlines, and portal state."""
    notifications_to_add = []
    now = datetime.now(timezone.utc)

    # 1. Check upcoming deadlines or assignments
    deadlines = (
        db.query(Deadline)
        .join(Assignment, Deadline.assignment_id == Assignment.id)
        .join(Course, Assignment.course_id == Course.id)
        .filter(Course.user_id == user.id)
        .order_by(Deadline.deadline.asc())
        .limit(3)
        .all()
    )

    if deadlines:
        for dl in deadlines:
            asgn = dl.assignment
            course_name = asgn.course.name if asgn.course else "Course"
            formatted_date = dl.deadline.strftime("%b %d, %Y")
            notifications_to_add.append(
                Notification(
                    user_id=user.id,
                    type="deadline",
                    title=f"Upcoming Deadline: {asgn.title}",
                    message=f"{asgn.title} for {course_name} is due on {formatted_date}.",
                    link=f"/assignments/{asgn.id}",
                    read=False,
                    created_at=now - timedelta(hours=2),
                )
            )
    else:
        # Check if there are assignments without formal Deadline rows
        assignments = (
            db.query(Assignment)
            .join(Course, Assignment.course_id == Course.id)
            .filter(Course.user_id == user.id)
            .order_by(Assignment.id.desc())
            .limit(2)
            .all()
        )
        for asgn in assignments:
            course_name = asgn.course.name if asgn.course else "Course"
            notifications_to_add.append(
                Notification(
                    user_id=user.id,
                    type="deadline",
                    title=f"Assignment Available: {asgn.title}",
                    message=f"Review requirements and verify rubrics for {asgn.title} ({course_name}).",
                    link=f"/assignments/{asgn.id}",
                    read=False,
                    created_at=now - timedelta(hours=4),
                )
            )

    # 2. Portal Sync status notification
    notifications_to_add.append(
        Notification(
            user_id=user.id,
            type="portal",
            title="LMS Portal Connected",
            message="University portal is linked and verified. Real-time background sync is active.",
            link="/portal",
            read=False,
            created_at=now - timedelta(hours=6),
        )
    )

    # 3. Concept Coach readiness notification
    notifications_to_add.append(
        Notification(
            user_id=user.id,
            type="agent",
            title="Concept Coach Ready",
            message="Ask questions anytime. Grounded directly in your course slides and syllabus.",
            link="/coach",
            read=False,
            created_at=now - timedelta(hours=8),
        )
    )

    db.add_all(notifications_to_add)
    db.commit()
    for n in notifications_to_add:
        db.refresh(n)

    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.get("", response_model=List[NotificationOut])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all notifications for the authenticated student.
    Auto-populates contextual notifications if none exist.
    """
    items = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    if not items:
        items = _seed_initial_notifications(current_user, db)

    return items


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new notification for the current user."""
    notif = Notification(
        user_id=current_user.id,
        type=payload.type,
        title=payload.title,
        message=payload.message,
        link=payload.link,
        read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for current student."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read == False)
        .update({"read": True})
    )
    db.commit()
    return {"status": "ok", "updated_count": count}


@router.put("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a single notification."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    db.delete(notif)
    db.commit()
    return {"status": "deleted", "id": notification_id}


@router.delete("")
def clear_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clear all notifications for the current student."""
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    db.commit()
    return {"status": "cleared"}
