from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException

from app.core.guards import require_admin_user
from app.core.security import get_current_user_claims
from app.db.session import get_db_connection
from app.schemas.me import MeResponse
from app.core.billing_processing import freeze_shop_billing_period

router = APIRouter(prefix="/billing", tags=["billing"])

def _parse_month(month):
    if month is None:
        today = date.today()
        return today.replace(day=1)
    try:
        return datetime.strptime(month, "%Y-%m").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid month format") from exc

@router.post("/region/freeze")
def freeze_region_billing(
    month: str = Query(pattern=r"^\d{4}-\d{2}$"),
    user: MeResponse = Depends(require_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    """
    Bulk freeze for all shops in the region for the given month.
    """
    period_month = _parse_month(month)
    
    results = []
    
    with get_db_connection(jwt_claims) as conn:
        with conn:
            with conn.cursor() as cur:
                # 1. Get all shops visible to this admin (RLS applied)
                cur.execute("SELECT id, name FROM shop")
                shops = cur.fetchall()
                
                if not shops:
                    return {"message": "No shops found in region", "processed": 0}

                # 2. Iterate and freeze
                for shop_id, shop_name in shops:
                    try:
                        freeze_shop_billing_period(
                            cur=cur,
                            shop_id=str(shop_id),
                            period_month=period_month,
                            frozen_by_user_id=user.user_id,
                            frozen_by_email=user.email,
                            frozen_comment="Regional Bulk Freeze"
                        )
                        results.append({
                            "shop_id": shop_id,
                            "name": shop_name,
                            "status": "frozen",
                            "error": None
                        })
                    except HTTPException as e:
                        # Capture known errors (e.g. 409 already frozen, 400 no deliveries)
                        results.append({
                            "shop_id": shop_id,
                            "name": shop_name,
                            "status": "skipped",
                            "error": str(e.detail)
                        })
                    except Exception as e:
                        results.append({
                            "shop_id": shop_id,
                            "name": shop_name,
                            "status": "failed",
                            "error": str(e)
                        })
                        
    return {
        "month": month,
        "total_shops": len(shops),
        "results": results
    }
