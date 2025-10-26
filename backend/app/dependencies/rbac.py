import os
from fastapi import HTTPException

from .auth import CurrentUser


def _get_admin_emails() -> set[str]:
    raw = os.getenv("ADMIN_EMAILS", "")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def user_is_admin(user: CurrentUser) -> bool:
    if "admin" in user.roles:
        return True
    admin_emails = _get_admin_emails()
    if user.email and user.email.lower() in admin_emails:
        return True
    return False


def require_roles(user: CurrentUser, required: list[str]) -> None:
    if any(role in user.roles for role in required):
        return
    raise HTTPException(status_code=403, detail="Insufficient role")


