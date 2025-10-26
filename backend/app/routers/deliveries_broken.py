from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Tuple
from datetime import datetime, timezone, timedelta
import time

from ..dependencies.auth import get_current_user, CurrentUser
from ..schemas.deliveries import Delivery, DeliveryCreate
from ..services.db import get_db
from ..services.sheets import append_rows, update_row, clear_row, delete_row_by_delivery_id
from ..services.pricing import compute_fee_for_delivery
from ..services.metrics import log_pricing_calculation, log_performance_metrics, log_error_with_context
from ..services.firestore_optimization import FirestoreOptimizer
from ..services.ux import start_operation_loading, complete_operation, notify_success, notify_error
from ..services.undo_redo import add_action, ActionType
from ..services.realtime import publish_update, UpdateType


router = APIRouter(prefix="/deliveries", tags=["deliveries"]) 


@router.post("", response_model=dict)
def create_delivery(payload: DeliveryCreate, current_user: CurrentUser = Depends(get_current_user)):
    # Start loading operation
    operation_id = start_operation_loading("create_delivery", "Creating delivery...")
    
    try:
        if "admin" not in current_user.roles and "shop" not in current_user.roles:
            complete_operation(operation_id, False, "Not authorized")
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # If caller is a shop, default to their shopId when not provided
        if "shop" in current_user.roles:
            effective_shop = payload.shopId or current_user.shop_id or ""
            if not effective_shop:
                complete_operation(operation_id, False, "Missing shopId for shop user")
                raise HTTPException(status_code=422, detail="Missing shopId for shop user")
            payload.shopId = effective_shop
        
        db = get_db()
        data = payload.model_dump()
        data.update({"createdAt": datetime.utcnow().isoformat(), "updatedAt": datetime.utcnow().isoformat()})
        
        # Compute pricing if shop configuration exists
        try:
            shop_snap = None
            shop = None
            client_info = {}
            if payload.shopId:
                shop_snap = db.collection("shops").document(payload.shopId).get()
                shop = shop_snap.to_dict() if shop_snap and shop_snap.exists else None
            try:
                c = db.collection("clients").document(payload.clientId).get()
                client_info = c.to_dict() or {}
            except Exception:
                client_info = {}
            if shop and shop.get("pricing"):
                pr = compute_fee_for_delivery({**data}, shop, client_info)
                data.update({
                    "fee": pr.total_fee,
                    "feeSplit": {
                        "shop": pr.shop_fee,
                        "authority": pr.authority_fee,
                        "chain": pr.chain_fee,
                    },
                    "pricingMode": pr.mode,
                    "cms": bool(client_info.get("cms")),
                })
                # Log pricing calculation
                log_pricing_calculation(
                    delivery_id="pending",
                    shop_id=payload.shopId,
                    pricing_mode=pr.mode,
                    is_cms=pr.is_cms,
                    bags=payload.bags,
                    amount=payload.amount,
                    total_fee=pr.total_fee,
                    shop_fee=pr.shop_fee,
                    authority_fee=pr.authority_fee,
                    chain_fee=pr.chain_fee
                )
        except Exception:
            pass

        # write to deliveries
        doc_ref = db.collection("deliveries").document()
        data_with_id = {**data, "id": doc_ref.id}
        doc_ref.set(data_with_id)
        # mirror to globalDeliveries
        db.collection("globalDeliveries").document(doc_ref.id).set(data_with_id)
        
        # Append to Sheets if shop configured
        try:
            shop_snap = db.collection("shops").document(payload.shopId or "").get() if payload.shopId else None
            shop = shop_snap.to_dict() if shop_snap and shop_snap.exists else None
            spreadsheet_id = shop.get("spreadsheetId") if shop else None
            sheet_name = shop.get("sheetName") if shop else None
            if spreadsheet_id and sheet_name:
                # Build one row with the same mapping as export
            date_str = ""; time_str = ""
            if data_with_id.get("startWindow"):
                try:
                    dt = datetime.fromisoformat(data_with_id["startWindow"].replace("Z", "+00:00"))
                    date_str = dt.strftime("%d.%m.%Y"); time_str = dt.strftime("%H:%M")
                except Exception:
                    pass
            client_info = {}
            try:
                c = db.collection("clients").document(payload.clientId).get()
                client_info = c.to_dict() or {}
            except Exception:
                client_info = {}
            info_parts = []
            addr = client_info.get("address") or {}
            if addr:
                info_parts.append(f"{addr.get('street','')} {addr.get('streetNumber','')} {addr.get('zip','')} {addr.get('city','')}")
            if client_info.get("floor"):
                info_parts.append(f"Etage: {client_info['floor']}")
            if client_info.get("entryCode"):
                info_parts.append(f"Code: {client_info['entryCode']}")
            if client_info.get("phone"):
                info_parts.append(f"Tél: {client_info['phone']}")
            information = " ".join(p for p in info_parts if p.strip())
            tarif = "CMS" if client_info.get("cms") else "DringDring"
            client_name = shop.get("name") if shop else (payload.shopId or "")
            course_name = f"{client_name} - DD" if client_name else "DD"
            # Optional fee fields
            fee_total = data_with_id.get("fee", "")
            fee_shop = (data_with_id.get("feeSplit") or {}).get("shop", "")
            fee_auth = (data_with_id.get("feeSplit") or {}).get("authority", "")
            fee_chain = (data_with_id.get("feeSplit") or {}).get("chain", "")
            row = [
                date_str,
                time_str,
                "DringDring",
                client_name,
                course_name,
                information,
                tarif,
                data_with_id.get("bags", 0),
                data_with_id.get("amount", ""),
                data_with_id.get("sector", ""),
                data_with_id.get("ticketNo", ""),
                data_with_id.get("id", ""),
                # technical columns for filtering/analytics
                data_with_id.get("shopId", ""),
                (shop or {}).get("chainId", ""),
                (shop or {}).get("regionId", ""),
                # pricing columns (optional)
                fee_total,
                fee_shop,
                fee_auth,
                fee_chain,
            ]
            row_index = append_rows(spreadsheet_id, sheet_name, [row])
            if row_index:
                # persist pointer to sheet row for future updates/deletes
                doc_ref.update({"sheetRow": row_index})
                db.collection("globalDeliveries").document(doc_ref.id).update({"sheetRow": row_index})
    except Exception:
        # On erreur Sheets, on n'échoue pas la création de livraison
        pass
    
    # Complete operation with success
    complete_operation(operation_id, True, "Delivery created successfully")
    
    # Add to undo/redo history
    add_action(
        ActionType.CREATE_DELIVERY,
        f"Created delivery for client {payload.clientId}",
        data_with_id,
        {"delivery_id": doc_ref.id},  # undo data
        data_with_id,  # redo data
        current_user.user_id,
        shop_id=payload.shopId,
        delivery_id=doc_ref.id
    )
    
    # Publish real-time update
    publish_update(
        UpdateType.DELIVERY_CREATED,
        {"delivery": data_with_id},
        user_id=current_user.user_id,
        shop_id=payload.shopId,
        delivery_id=doc_ref.id
    )
    
    # Create success notification
    notify_success("Delivery Created", f"Delivery {doc_ref.id} has been created successfully")
    
    return {"id": doc_ref.id}
    
    except Exception as e:
        # Complete operation with error
        complete_operation(operation_id, False, "Failed to create delivery", str(e))
        
        # Create error notification
        notify_error("Delivery Creation Failed", f"Failed to create delivery: {str(e)}")
        
        # Log error
        log_error_with_context(e, {
            "operation": "create_delivery",
            "shop_id": payload.shopId,
            "client_id": payload.clientId
        })
        
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{delivery_id}", response_model=Delivery)
def get_delivery(delivery_id: str, current_user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    snap = db.collection("deliveries").document(delivery_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Delivery not found")
    data = snap.to_dict() or {}
    return Delivery(**data)


@router.get("", response_model=dict)
def list_deliveries(
    shopId: Optional[str] = None,
    futureOnly: bool = False,
    limit: int = 10,
    cursor: Optional[str] = None,
    sort: str = "desc",
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    sector: Optional[str] = None,
    employee: Optional[str] = None,
    current_user: CurrentUser = Depends(get_current_user),
):
    db = get_db()
    limit = max(1, min(limit, 50))
    # time bounds
    now = datetime.now(timezone.utc)
    lookback_default = (now - timedelta(days=31)).isoformat().replace("+00:00", "Z")
    lower = dateFrom or lookback_default
    upper = dateTo or None

    # Build base query ordered by startWindow
    direction = "DESCENDING" if str(sort).lower() == "desc" else "ASCENDING"

    def build_query(with_shop: bool):
        q = db.collection("deliveries").where("startWindow", ">=", lower)
        if upper:
            q = q.where("startWindow", "<=", upper)
        if with_shop:
            # Restrict to shop when possible
            sid = None
            if "shop" in current_user.roles and "admin" not in current_user.roles:
                sid = current_user.shop_id
            elif shopId:
                sid = shopId
            if sid:
                q = q.where("shopId", "==", sid)
        q = q.order_by("startWindow", direction=direction)
        if cursor:
            try:
                q = q.start_after([cursor])
            except Exception:
                pass
        return q

    items: List[Delivery] = []
    next_cursor: Optional[str] = None
    # Try with shop filter first; fall back to without if Firestore complains or not enough docs
    queries = [True, False]
    for with_shop in queries:
        try:
            fetch_limit = min(100, limit * (2 if not with_shop else 1))
            for doc in build_query(with_shop).limit(fetch_limit).stream():
                data = doc.to_dict() or {}
                # In-memory checks
                if not with_shop:
                    # enforce role/shop scoping
                    if "shop" in current_user.roles and "admin" not in current_user.roles:
                        if current_user.shop_id and data.get("shopId") != current_user.shop_id:
                            continue
                    elif shopId and data.get("shopId") != shopId:
                        continue
                if futureOnly:
                    sw = data.get("startWindow")
                    try:
                        if sw and datetime.fromisoformat(sw.replace("Z", "+00:00")) < datetime(now.year, now.month, now.day, tzinfo=timezone.utc):
                            continue
                    except Exception:
                        pass
                if sector and (data.get("sector") or "").strip() != sector.strip():
                    continue
                if employee and (data.get("employee") or "").strip() != employee.strip():
                    continue
                items.append(Delivery(**data))
                if len(items) >= limit:
                    break
            if items:
                sw_last = items[-1].startWindow
                if sw_last:
                    next_cursor = sw_last
            if len(items) >= limit:
                break
        except Exception:
            # fallback to the next strategy
            continue

    return {"items": items, "nextCursor": next_cursor}


@router.patch("/{delivery_id}", response_model=Delivery)
def update_delivery(delivery_id: str, payload: dict, current_user: CurrentUser = Depends(get_current_user)):
    if "admin" not in current_user.roles and "shop" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    db = get_db()
    doc_ref = db.collection("deliveries").document(delivery_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Delivery not found")
    existing = snap.to_dict() or {}
    # Prevent changing immutable fields
    for k in ["shopId", "clientId", "id"]:
        payload.pop(k, None)
    # Recompute pricing if bags/amount changed
    try:
        changed_keys = set(payload.keys())
        needs_reprice = any(k in changed_keys for k in ["bags", "amount"]) or not all(
            key in (existing or {}) for key in ["fee", "feeSplit"]
        )
        if needs_reprice:
            # Merge existing with incoming to compute
            effective = {**existing, **payload}
            shop_doc = db.collection("shops").document(effective.get("shopId") or "").get()
            shop = shop_doc.to_dict() if shop_doc and shop_doc.exists else None
            client_info = {}
            try:
                c = db.collection("clients").document(effective.get("clientId")).get()
                client_info = c.to_dict() or {}
            except Exception:
                client_info = {}
            if shop and shop.get("pricing"):
                pr = compute_fee_for_delivery(effective, shop, client_info)
                payload.update({
                    "fee": pr.total_fee,
                    "feeSplit": {"shop": pr.shop_fee, "authority": pr.authority_fee, "chain": pr.chain_fee},
                    "pricingMode": pr.mode,
                    "cms": bool(client_info.get("cms")),
                })
    except Exception:
        pass
    payload["updatedAt"] = datetime.utcnow().isoformat()
    doc_ref.update(payload)
    # mirror
    db.collection("globalDeliveries").document(delivery_id).update(payload)
    updated = doc_ref.get().to_dict() or {}
    # Sheets sync after update
    try:
        shop_snap = db.collection("shops").document(updated.get("shopId") or "").get()
        shop = shop_snap.to_dict() if shop_snap and shop_snap.exists else None
        spreadsheet_id = shop.get("spreadsheetId") if shop else None
        sheet_name = shop.get("sheetName") if shop else None
        row_index = updated.get("sheetRow")
        if spreadsheet_id and sheet_name and row_index:
            # rebuild row using same mapping as creation
            date_str = ""; time_str = ""
            if updated.get("startWindow"):
                try:
                    dt = datetime.fromisoformat(updated["startWindow"].replace("Z", "+00:00"))
                    date_str = dt.strftime("%d.%m.%Y"); time_str = dt.strftime("%H:%M")
                except Exception:
                    pass
            client_info = {}
            try:
                c = db.collection("clients").document(updated.get("clientId")).get()
                client_info = c.to_dict() or {}
            except Exception:
                client_info = {}
            info_parts = []
            addr = client_info.get("address") or {}
            if addr:
                info_parts.append(f"{addr.get('street','')} {addr.get('streetNumber','')} {addr.get('zip','')} {addr.get('city','')}")
            if client_info.get("floor"):
                info_parts.append(f"Etage: {client_info['floor']}")
            if client_info.get("entryCode"):
                info_parts.append(f"Code: {client_info['entryCode']}")
            if client_info.get("phone"):
                info_parts.append(f"Tél: {client_info['phone']}")
            information = " ".join(p for p in info_parts if p.strip())
            tarif = "CMS" if client_info.get("cms") else "DringDring"
            client_name = shop.get("name") if shop else (updated.get("shopId") or "")
            course_name = f"{client_name} - DD" if client_name else "DD"
            fee_total = updated.get("fee", "")
            fee_shop = (updated.get("feeSplit") or {}).get("shop", "")
            fee_auth = (updated.get("feeSplit") or {}).get("authority", "")
            fee_chain = (updated.get("feeSplit") or {}).get("chain", "")
            row = [
                date_str,
                time_str,
                "DringDring",
                client_name,
                course_name,
                information,
                tarif,
                updated.get("bags", 0),
                updated.get("amount", ""),
                updated.get("sector", ""),
                updated.get("ticketNo", ""),
                updated.get("id", ""),
                updated.get("shopId", ""),
                (shop or {}).get("chainId", ""),
                (shop or {}).get("regionId", ""),
                fee_total,
                fee_shop,
                fee_auth,
                fee_chain,
            ]
            update_row(spreadsheet_id, sheet_name, int(row_index), row)
    except Exception:
        pass
    return Delivery(**updated)


@router.delete("/{delivery_id}", response_model=dict)
def delete_delivery(delivery_id: str, current_user: CurrentUser = Depends(get_current_user)):
    if "admin" not in current_user.roles and "shop" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    db = get_db()
    doc_ref = db.collection("deliveries").document(delivery_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Delivery not found")
    existing = snap.to_dict() or {}
    # attempt Sheets clear
    try:
        shop_snap = db.collection("shops").document(existing.get("shopId") or "").get()
        shop = shop_snap.to_dict() if shop_snap and shop_snap.exists else None
        spreadsheet_id = shop.get("spreadsheetId") if shop else None
        sheet_name = shop.get("sheetName") if shop else None
        if spreadsheet_id and sheet_name:
            # Prefer deleting the row entirely by DeliveryId
            if not delete_row_by_delivery_id(spreadsheet_id, sheet_name, existing.get("id") or ""):
                row_index = existing.get("sheetRow")
                if row_index:
                    clear_row(spreadsheet_id, sheet_name, int(row_index))
    except Exception:
        pass
    # delete docs
    doc_ref.delete()
    db.collection("globalDeliveries").document(delivery_id).delete()
    return {"ok": True}


