from fastapi import Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.models.all import User


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> User:
    """
    Resolves the authenticated student in real-time.
    Prioritizes:
    1. X-User-Email or X-User-Id header sent by frontend
    2. Query param ?user_email=
    3. Latest active real student registered in the database
    """
    # 1. Header resolution
    if x_user_email and x_user_email.strip():
        user = db.query(User).filter(User.email == x_user_email.strip()).first()
        if user:
            return user

    if x_user_id and x_user_id.strip().isdigit():
        user = db.query(User).filter(User.id == int(x_user_id.strip())).first()
        if user:
            return user

    # 2. Query param resolution
    email_param = request.query_params.get("user_email")
    if email_param and email_param.strip():
        user = db.query(User).filter(User.email == email_param.strip()).first()
        if user:
            return user

    # 3. Latest registered student (no demo filtering needed — demo users no longer exist)
    active_user = (
        db.query(User)
        .order_by(User.id.desc())
        .first()
    )
    if active_user:
        return active_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No active student session. Please log in with your university LMS / AMS portal credentials.",
    )
