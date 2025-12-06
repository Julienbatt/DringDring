from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from ..dependencies.auth import get_current_user, CurrentUser
from ..services.db import get_db


router = APIRouter(prefix="/client", tags=["client"])


class ClientStats(BaseModel):
  totalDeliveries: int
  thisMonth: int
  totalBags: int
  averageBags: float
  upcomingDeliveries: int
  lastDelivery: Optional[str] = None


class ClientDelivery(BaseModel):
  id: str
  startWindow: str
  status: str
  bags: int
  shopName: Optional[str] = None
  shopId: Optional[str] = None
  amount: Optional[float] = None
  cms: Optional[bool] = None


def _require_client(current_user: CurrentUser) -> str:
  if "client" not in current_user.roles:
      raise HTTPException(status_code=403, detail="Client access required")
  client_id = current_user.client_id
  if not client_id:
      raise HTTPException(status_code=403, detail="Client profile missing")
  return client_id


def _serialize_delivery(doc) -> ClientDelivery:
  data = doc.to_dict() or {}
  data["id"] = doc.id
  return ClientDelivery(
      id=doc.id,
      startWindow=data.get("startWindow") or data.get("date") or "",
      status=data.get("status", "scheduled"),
      bags=int(data.get("bags") or 0),
      shopName=data.get("shopName"),
      shopId=data.get("shopId"),
      amount=data.get("amount"),
      cms=data.get("cms"),
  )


@router.get("/stats", response_model=ClientStats)
def get_client_stats(current_user: CurrentUser = Depends(get_current_user)):
  client_id = _require_client(current_user)
  db = get_db()
  deliveries_ref = (
      db.collection("deliveries")
      .where("clientId", "==", client_id)
      .order_by("startWindow", direction="DESCENDING")
      .limit(365)
  )
  deliveries_docs = list(deliveries_ref.stream())
  deliveries = [_serialize_delivery(doc) for doc in deliveries_docs]

  now = datetime.now(timezone.utc)
  this_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

  total_deliveries = len(deliveries)
  total_bags = sum(d.bags for d in deliveries)
  average_bags = (total_bags / total_deliveries) if total_deliveries else 0

  this_month_deliveries = sum(
      1 for d in deliveries if datetime.fromisoformat(d.startWindow.replace("Z", "+00:00")) >= this_month
  )

  upcoming_deliveries = sum(
      1 for d in deliveries
      if datetime.fromisoformat(d.startWindow.replace("Z", "+00:00")) > now
      and d.status not in {"delivered", "cancelled"}
  )

  last_delivery = deliveries[0].startWindow if deliveries else None

  return ClientStats(
      totalDeliveries=total_deliveries,
      thisMonth=this_month_deliveries,
      totalBags=total_bags,
      averageBags=round(average_bags, 2),
      upcomingDeliveries=upcoming_deliveries,
      lastDelivery=last_delivery,
  )


@router.get("/deliveries", response_model=List[ClientDelivery])
def list_client_deliveries(current_user: CurrentUser = Depends(get_current_user)):
  client_id = _require_client(current_user)
  db = get_db()
  query = (
      db.collection("deliveries")
      .where("clientId", "==", client_id)
      .order_by("startWindow", direction="DESCENDING")
      .limit(200)
  )
  return [_serialize_delivery(doc) for doc in query.stream()]


@router.get("/deliveries/upcoming", response_model=List[ClientDelivery])
def get_upcoming_deliveries(current_user: CurrentUser = Depends(get_current_user)):
  client_id = _require_client(current_user)
  db = get_db()
  now_iso = datetime.now(timezone.utc).isoformat()
  query = (
      db.collection("deliveries")
      .where("clientId", "==", client_id)
      .where("startWindow", ">=", now_iso)
      .order_by("startWindow", direction="ASCENDING")
      .limit(50)
  )
  deliveries = [
      d for d in (_serialize_delivery(doc) for doc in query.stream())
      if d.status not in {"delivered", "cancelled"}
  ]
  return deliveries


@router.get("/deliveries/history", response_model=List[ClientDelivery])
def get_delivery_history(current_user: CurrentUser = Depends(get_current_user)):
  client_id = _require_client(current_user)
  db = get_db()
  now_iso = datetime.now(timezone.utc).isoformat()
  query = (
      db.collection("deliveries")
      .where("clientId", "==", client_id)
      .where("startWindow", "<", now_iso)
      .order_by("startWindow", direction="DESCENDING")
      .limit(100)
  )
  return [_serialize_delivery(doc) for doc in query.stream()]
