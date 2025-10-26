from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from ..dependencies.auth import get_current_user, CurrentUser
from ..dependencies.rbac import user_is_admin
from firebase_admin import auth as admin_auth
from ..services.db import get_db
from ..services.sheets import upsert_sheet
from datetime import datetime
import os


router = APIRouter(prefix="/admin", tags=["admin"]) 


class SetClaimsRequest(BaseModel):
    uid: str | None = None
    email: str | None = None
    roles: List[str]
    shopId: str | None = None
    regionId: str | None = None
    chainId: str | None = None


@router.post("/set-claims")
def set_custom_claims(payload: SetClaimsRequest, current_user: CurrentUser = Depends(get_current_user)):
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    target_uid = payload.uid
    if not target_uid and payload.email:
        user = admin_auth.get_user_by_email(payload.email)
        target_uid = user.uid
    if not target_uid:
        raise HTTPException(status_code=400, detail="Provide uid or email")
    claims = {"roles": payload.roles}
    if payload.shopId:
        claims["shopId"] = payload.shopId
    if payload.regionId:
        claims["regionId"] = payload.regionId
    if payload.chainId:
        claims["chainId"] = payload.chainId
    admin_auth.set_custom_user_claims(target_uid, claims)
    return {"ok": True, "uid": target_uid, **claims}


class ExportSheetsRequest(BaseModel):
    spreadsheetId: str
    sheetName: str = "Livraisons"


@router.post("/sheets/export")
def export_sheets(payload: ExportSheetsRequest, current_user: CurrentUser = Depends(get_current_user)):
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    rows = []
    headers = [
        "Date", "Heure", "Type", "Client", "Course", "Information", "Tarif", "Quantité", "Total Ticket", "Secteur", "n ticket", "DeliveryId",
        "ShopId", "ChainId", "RegionId", "Fee Total", "Fee Shop", "Fee Authority", "Fee Chain",
    ]
    deliveries_ref = db.collection("globalDeliveries")
    # If caller is a shop (even with admin), allow scoping by their shopId
    if "shop" in current_user.roles and current_user.shop_id:
        deliveries_ref = deliveries_ref.where("shopId", "==", current_user.shop_id)
    for doc in deliveries_ref.stream():
        d = doc.to_dict() or {}
        # Parse date/time
        date_str = ""
        time_str = ""
        if d.get("startWindow"):
            try:
                dt = datetime.fromisoformat(d["startWindow"].replace("Z", "+00:00"))
                date_str = dt.strftime("%d.%m.%Y")
                time_str = dt.strftime("%H:%M")
            except Exception:
                pass
        # Derive fields from delivery and client
        client_name = d.get("shopName") or d.get("shopId") or ""
        course_name = f"{client_name} - DD" if client_name else "DD"
        info_parts = []
        addr = d.get("clientAddress") or {}
        if addr:
            info_parts.append(f"{addr.get('street','')} {addr.get('streetNumber','')} {addr.get('zip','')} {addr.get('city','')}")
        if d.get("clientFloor"):
            info_parts.append(f"Etage: {d['clientFloor']}")
        if d.get("clientEntryCode"):
            info_parts.append(f"Code: {d['clientEntryCode']}")
        if d.get("clientPhone"):
            info_parts.append(f"Tél: {d['clientPhone']}")
        information = " ".join(p for p in info_parts if p.strip())
        tarif = "CMS" if d.get("cms") else "DringDring"
        rows.append([
            date_str,
            time_str,
            "DringDring",
            client_name,
            course_name,
            information,
            tarif,
            d.get("bags", 0),
            d.get("amount", ""),
            d.get("sector", ""),
            d.get("ticketNo", ""),
            d.get("id", ""),
            d.get("shopId", ""),
            d.get("chainId", ""),
            d.get("regionId", ""),
            d.get("fee", ""),
            (d.get("feeSplit") or {}).get("shop", ""),
            (d.get("feeSplit") or {}).get("authority", ""),
            (d.get("feeSplit") or {}).get("chain", ""),
        ])
    upsert_sheet(payload.spreadsheetId, payload.sheetName, headers, rows)
    return {"ok": True, "rows": len(rows)}


class AdminUser(BaseModel):
    uid: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    disabled: bool = False
    roles: List[str] = []
    shopId: Optional[str] = None
    regionId: Optional[str] = None


class ListUsersResponse(BaseModel):
    items: List[AdminUser]
    nextPageToken: Optional[str] = None


@router.get("/users", response_model=ListUsersResponse)
def list_users(pageToken: str | None = None, limit: int = 50, query: str | None = None, current_user: CurrentUser = Depends(get_current_user)):
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    limit = max(1, min(limit, 1000))
    try:
        # If searching by email and it's exact, prefer direct lookup
        if query and "@" in query and len(query) > 3:
            try:
                u = admin_auth.get_user_by_email(query)
                claims = (u.custom_claims or {})
                roles = claims.get("roles", []) if isinstance(claims.get("roles", []), list) else []
                return ListUsersResponse(items=[AdminUser(uid=u.uid, email=u.email, displayName=u.display_name, disabled=u.disabled, roles=roles, shopId=claims.get("shopId"), regionId=claims.get("regionId"))], nextPageToken=None)
            except Exception:
                # Fallback to paged listing if not found
                pass
        page = admin_auth.list_users(page_token=pageToken, max_results=limit)
        items: List[AdminUser] = []
        for u in page.users:
            # Optional substring filter on email if query provided
            if query and u.email and query.lower() not in u.email.lower():
                continue
            claims = (u.custom_claims or {})
            roles = claims.get("roles", []) if isinstance(claims.get("roles", []), list) else []
            items.append(AdminUser(uid=u.uid, email=u.email, displayName=u.display_name, disabled=u.disabled, roles=roles, shopId=claims.get("shopId"), regionId=claims.get("regionId")))
        return ListUsersResponse(items=items, nextPageToken=page.next_page_token)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {exc}")

