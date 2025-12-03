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
        
        # Fetch client info for denormalization and pricing
        client_info = {}
        try:
            c = db.collection("clients").document(payload.clientId).get()
            client_info = c.to_dict() or {}
        except Exception:
            client_info = {}

        # Compute pricing if shop configuration exists
        try:
            shop_snap = None
            shop = None
            # client_info already fetched above
            if payload.shopId:
                shop_snap = db.collection("shops").document(payload.shopId).get()
                shop = shop_snap.to_dict() if shop_snap and shop_snap.exists else None
            
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

        # Denormalize client info
        if client_info:
            data["clientName"] = f"{client_info.get('firstName', '')} {client_info.get('lastName', '')}".strip()
            addr = client_info.get("address") or {}
            data["clientAddress"] = f"{addr.get('street', '')} {addr.get('streetNumber', '')}, {addr.get('zip', '')} {addr.get('city', '')}".strip()

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
                    payload.shopId or "",
                    shop.get("chainId", "") if shop else "",
                    shop.get("regionId", "") if shop else "",
                    fee_total,
                    fee_shop,
                    fee_auth,
                    fee_chain
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
    current_user: CurrentUser = Depends(get_current_user)
):
    db = get_db()
    
    # Build query
    query = db.collection("deliveries")
    
    # Apply filters based on user role
    if "shop" in current_user.roles:
        query = query.where("shopId", "==", current_user.shop_id)
    elif shopId:
        query = query.where("shopId", "==", shopId)
    
    # Date filters
    if dateFrom:
        try:
            from_dt = datetime.fromisoformat(dateFrom.replace('Z', '+00:00'))
            query = query.where("startWindow", ">=", from_dt.isoformat())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid dateFrom format")
    
    if dateTo:
        try:
            to_dt = datetime.fromisoformat(dateTo.replace('Z', '+00:00'))
            query = query.where("startWindow", "<=", to_dt.isoformat())
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid dateTo format")
    
    # Future only filter
    if futureOnly:
        now = datetime.now(timezone.utc)
        query = query.where("startWindow", ">=", now.isoformat())
    
    # Ordering
    order_field = "startWindow"
    if sort == "desc":
        query = query.order_by(order_field, direction="DESCENDING")
    else:
        query = query.order_by(order_field, direction="ASCENDING")
    
    # Cursor pagination
    if cursor:
        try:
            cursor_doc = db.collection("deliveries").document(cursor).get()
            if cursor_doc.exists:
                cursor_data = cursor_doc.to_dict()
                if sort == "desc":
                    query = query.start_after(cursor_doc)
                else:
                    query = query.start_at(cursor_doc)
        except Exception:
            pass
    
    # Execute query
    docs = query.limit(limit + 1).stream()
    deliveries = []
    next_cursor = None
    
    for i, doc in enumerate(docs):
        if i >= limit:
            next_cursor = doc.id
            break
        data = doc.to_dict()
        data["id"] = doc.id
        deliveries.append(Delivery(**data))
    
    return {
        "deliveries": deliveries,
        "nextCursor": next_cursor,
        "hasMore": next_cursor is not None
    }


@router.put("/{delivery_id}", response_model=dict)
def update_delivery(
    delivery_id: str, 
    payload: DeliveryCreate, 
    current_user: CurrentUser = Depends(get_current_user)
):
    if "admin" not in current_user.roles and "shop" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db = get_db()
    
    # Check if delivery exists
    delivery_ref = db.collection("deliveries").document(delivery_id)
    delivery_doc = delivery_ref.get()
    if not delivery_doc.exists:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Check permissions
    delivery_data = delivery_doc.to_dict()
    if "shop" in current_user.roles and delivery_data.get("shopId") != current_user.shop_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this delivery")
    
    # Update data
    data = payload.model_dump()
    data.update({"updatedAt": datetime.utcnow().isoformat()})
    
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
    except Exception:
        pass
    
    # Update delivery
    delivery_ref.update(data)
    db.collection("globalDeliveries").document(delivery_id).update(data)
    
    # Update Sheets if configured
    try:
        shop_snap = db.collection("shops").document(payload.shopId or "").get() if payload.shopId else None
        shop = shop_snap.to_dict() if shop_snap and shop_snap.exists else None
        spreadsheet_id = shop.get("spreadsheetId") if shop else None
        sheet_name = shop.get("sheetName") if shop else None
        sheet_row = delivery_data.get("sheetRow")
        
        if spreadsheet_id and sheet_name and sheet_row:
            # Build updated row
            date_str = ""; time_str = ""
            if data.get("startWindow"):
                try:
                    dt = datetime.fromisoformat(data["startWindow"].replace("Z", "+00:00"))
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
            fee_total = data.get("fee", "")
            fee_shop = (data.get("feeSplit") or {}).get("shop", "")
            fee_auth = (data.get("feeSplit") or {}).get("authority", "")
            fee_chain = (data.get("feeSplit") or {}).get("chain", "")
            
            row = [
                date_str,
                time_str,
                "DringDring",
                client_name,
                course_name,
                information,
                tarif,
                data.get("bags", 0),
                data.get("amount", ""),
                data.get("sector", ""),
                data.get("ticketNo", ""),
                delivery_id,
                # technical columns for filtering/analytics
                payload.shopId or "",
                shop.get("chainId", "") if shop else "",
                shop.get("regionId", "") if shop else "",
                fee_total,
                fee_shop,
                fee_auth,
                fee_chain
            ]
            update_row(spreadsheet_id, sheet_name, sheet_row, row)
    except Exception:
        # On erreur Sheets, on n'échoue pas la mise à jour de livraison
        pass
    
    return {"id": delivery_id, "message": "Delivery updated successfully"}


@router.delete("/{delivery_id}", response_model=dict)
def delete_delivery(delivery_id: str, current_user: CurrentUser = Depends(get_current_user)):
    if "admin" not in current_user.roles and "shop" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db = get_db()
    
    # Check if delivery exists
    delivery_ref = db.collection("deliveries").document(delivery_id)
    delivery_doc = delivery_ref.get()
    if not delivery_doc.exists:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Check permissions
    delivery_data = delivery_doc.to_dict()
    if "shop" in current_user.roles and delivery_data.get("shopId") != current_user.shop_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this delivery")
    
    # Delete from Sheets if configured
    try:
        sheet_row = delivery_data.get("sheetRow")
        if sheet_row:
            shop_snap = db.collection("shops").document(delivery_data.get("shopId", "")).get()
            shop = shop_snap.to_dict() if shop_snap and shop_snap.exists else None
            spreadsheet_id = shop.get("spreadsheetId") if shop else None
            sheet_name = shop.get("sheetName") if shop else None
            
            if spreadsheet_id and sheet_name:
                clear_row(spreadsheet_id, sheet_name, sheet_row)
    except Exception:
        # On erreur Sheets, on n'échoue pas la suppression de livraison
        pass
    
    # Delete from database
    delivery_ref.delete()
    db.collection("globalDeliveries").document(delivery_id).delete()
    
    return {"id": delivery_id, "message": "Delivery deleted successfully"}
