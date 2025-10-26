from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Literal

from ..dependencies.auth import get_current_user, CurrentUser


router = APIRouter(prefix="/reports", tags=["reports"]) 


@router.get("/shops/{shop_id}/summary", response_model=dict)
def shop_summary(
    shop_id: str,
    granularity: Literal["day", "month", "year"] = Query("day"),
    dateFrom: str | None = None,
    dateTo: str | None = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    if "admin" not in current_user.roles and current_user.shop_id != shop_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # TODO: Aggregate from Firestore
    return {"granularity": granularity, "rows": []}


