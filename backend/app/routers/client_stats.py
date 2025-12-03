from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from ..dependencies.auth import get_current_user, CurrentUser
from ..services.db import get_db

router = APIRouter(prefix="/client", tags=["client-stats"])

class ClientStats(BaseModel):
    totalDeliveries: int
    thisMonth: int
    totalBags: int
    averageBags: float
    upcomingDeliveries: int
    lastDelivery: Optional[str] = None

class UpcomingDelivery(BaseModel):
    id: str
    date: str
    timeSlot: str
    bags: int
    status: str
    shopName: str

@router.get("/stats")
async def get_client_stats(current_user: CurrentUser = Depends(get_current_user)):
    """Get client statistics and upcoming deliveries"""
    if not current_user.client_id:
        # Return empty stats if not a client or no client_id linked
        return ClientStats(
            totalDeliveries=0,
            thisMonth=0,
            totalBags=0,
            averageBags=0.0,
            upcomingDeliveries=0,
            lastDelivery=None
        )

    db = get_db()
    cid = current_user.client_id
    
    # Fetch all deliveries for this client
    # Note: In production with composite index, we could do more efficient queries
    # For now, fetch all and process in memory (client volume expected to be manageable)
    docs = db.collection("deliveries").where("clientId", "==", cid).stream()
    
    deliveries = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        if d.get("startWindow"):
            deliveries.append(d)
            
    # Sort by date desc
    deliveries.sort(key=lambda x: x["startWindow"], reverse=True)
    
    now = datetime.now(timezone.utc)
    this_month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    total_deliveries = len(deliveries)
    this_month = 0
    total_bags = 0
    upcoming_count = 0
    last_delivery = None
    
    # Find last past delivery
    past_deliveries = []
    
    for d in deliveries:
        try:
            dt = datetime.fromisoformat(d["startWindow"].replace("Z", "+00:00"))
            bags = int(d.get("bags") or 0)
            total_bags += bags
            
            if dt >= this_month_start:
                this_month += 1
                
            if dt > now:
                upcoming_count += 1
            else:
                past_deliveries.append(dt)
                
        except Exception:
            continue
            
    if past_deliveries:
        # Past deliveries already sorted desc because main list is desc
        last_delivery = past_deliveries[0].isoformat()

    avg_bags = round(total_bags / total_deliveries, 1) if total_deliveries > 0 else 0.0

    return ClientStats(
        totalDeliveries=total_deliveries,
        thisMonth=this_month,
        totalBags=total_bags,
        averageBags=avg_bags,
        upcomingDeliveries=upcoming_count,
        lastDelivery=last_delivery
    )

@router.get("/deliveries/upcoming", response_model=List[UpcomingDelivery])
async def get_upcoming_deliveries(current_user: CurrentUser = Depends(get_current_user)):
    """Get upcoming deliveries for the client"""
    if not current_user.client_id:
        return []

    db = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Simple query (requires single field index on clientId which exists by default)
    # Filtering by date in memory to avoid composite index requirement
    docs = db.collection("deliveries").where("clientId", "==", current_user.client_id).stream()
    
    upcoming = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        sw = d.get("startWindow")
        if sw and sw > now_iso:
            # Get shop name if not denormalized (though we denormalize client info, we don't strictly denormalize shop name yet except in client logic?)
            # Actually, let's fetch shop name if missing or use shopId
            shop_name = d.get("shopId") # fallback
            # If we want real shop name, we should cache/fetch. 
            # Optimization: For now return shopId, frontend can handle or we fetch.
            # Better: fetch shop if needed.
            
            status = "scheduled" 
            if d.get("status"):
                status = d.get("status")
            
            # Format time slot
            try:
                dt = datetime.fromisoformat(sw.replace("Z", "+00:00"))
                time_slot = dt.strftime("%H:%M")
            except:
                time_slot = "??"

            upcoming.append(UpcomingDelivery(
                id=d["id"],
                date=sw,
                timeSlot=time_slot,
                bags=int(d.get("bags") or 0),
                status=status,
                shopName=shop_name
            ))
            
    # Sort ascending (nearest first)
    upcoming.sort(key=lambda x: x.date)
    
    # Enrich with shop names efficiently
    shop_ids = {u.shopName for u in upcoming}
    shop_map = {}
    if shop_ids:
        for sid in shop_ids:
            s = db.collection("shops").document(sid).get()
            if s.exists:
                shop_map[sid] = s.to_dict().get("name", sid)
    
    for u in upcoming:
        if u.shopName in shop_map:
            u.shopName = shop_map[u.shopName]

    return upcoming

@router.get("/deliveries", response_model=List[dict]) # Generalized list
async def get_all_deliveries(current_user: CurrentUser = Depends(get_current_user)):
    """Get all deliveries for the client"""
    if not current_user.client_id:
        return []
        
    db = get_db()
    docs = db.collection("deliveries").where("clientId", "==", current_user.client_id).stream()
    
    res = []
    shop_cache = {}
    
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        
        # Populate shop name
        sid = d.get("shopId")
        if sid:
            if sid not in shop_cache:
                s = db.collection("shops").document(sid).get()
                shop_cache[sid] = s.to_dict().get("name", sid) if s.exists else sid
            d["shopName"] = shop_cache[sid]
            
        d["date"] = d.get("startWindow") # frontend compat
        res.append(d)
        
    res.sort(key=lambda x: x.get("startWindow") or "", reverse=True)
    return res
