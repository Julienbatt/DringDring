from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Literal
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from ..dependencies.auth import get_current_user, CurrentUser
from ..services.db import get_db


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
    
    db = get_db()
    
    # Parse date filters
    start_dt = None
    end_dt = None
    if dateFrom:
        try:
            start_dt = datetime.fromisoformat(dateFrom.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid dateFrom format. Use ISO format")
    if dateTo:
        try:
            end_dt = datetime.fromisoformat(dateTo.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid dateTo format. Use ISO format")
    
    # Default to last 31 days if no dates provided
    if not start_dt:
        end_dt = datetime.now(timezone.utc) if not end_dt else end_dt
        start_dt = end_dt - timedelta(days=31)
    
    if not end_dt:
        end_dt = datetime.now(timezone.utc)
    
    # Query deliveries for this shop in the date range
    query = (
        db.collection("deliveries")
        .where("shopId", "==", shop_id)
        .where("startWindow", ">=", start_dt.isoformat())
        .where("startWindow", "<=", end_dt.isoformat())
        .order_by("startWindow")
    )
    
    # Aggregate by granularity
    rows = []
    aggregates: dict[str, dict] = defaultdict(lambda: {
        "date": "",
        "ticketNo": "",
        "montant": 0.0,
        "sacs": 0,
        "secteur": "",
        "cms": 0,
        "deliveries": 0
    })
    
    def get_group_key(dt: datetime) -> str:
        if granularity == "day":
            return dt.strftime("%Y-%m-%d")
        elif granularity == "month":
            return dt.strftime("%Y-%m")
        else:  # year
            return dt.strftime("%Y")
    
    try:
        for doc in query.stream():
            d = doc.to_dict() or {}
            dt_str = d.get("startWindow")
            if not dt_str:
                continue
            
            try:
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            except ValueError:
                continue
            
            key = get_group_key(dt)
            agg = aggregates[key]
            
            if not agg["date"]:
                if granularity == "day":
                    agg["date"] = dt.strftime("%d.%m.%Y")
                elif granularity == "month":
                    agg["date"] = dt.strftime("%m.%Y")
                else:
                    agg["date"] = dt.strftime("%Y")
            
            agg["deliveries"] += 1
            agg["sacs"] += int(d.get("bags", 0) or 0)
            agg["montant"] += float(d.get("amount", 0) or 0)
            
            if d.get("cms"):
                agg["cms"] += 1
            
            # Keep first ticketNo encountered (or concatenate if multiple)
            if d.get("ticketNo") and not agg["ticketNo"]:
                agg["ticketNo"] = str(d.get("ticketNo"))
            
            # Keep first sector encountered (or most common)
            if d.get("sector") and not agg["secteur"]:
                agg["secteur"] = str(d.get("sector"))
        
        # Convert aggregates to rows format
        for key in sorted(aggregates.keys()):
            agg = aggregates[key]
            rows.append({
                "Date": agg["date"],
                "Ticket no": agg["ticketNo"] or "",
                "Montant du ticket": f"{agg['montant']:.2f}",
                "# Sacs": agg["sacs"],
                "Secteur": agg["secteur"] or "",
                "CMS": "Oui" if agg["cms"] > 0 else "Non",
                "Livraisons": agg["deliveries"]
            })
    except Exception as e:
        # Log error but return partial results
        pass
    
    return {
        "granularity": granularity,
        "dateFrom": start_dt.isoformat(),
        "dateTo": end_dt.isoformat(),
        "rows": rows,
        "totalRows": len(rows)
    }


