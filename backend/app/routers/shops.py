from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import os
import time
import csv
from io import StringIO

from ..dependencies.auth import get_current_user, CurrentUser
from ..schemas.shops import Shop, ShopCreate
from ..services.db import get_db
from ..services.sheets import upsert_sheet
from ..services.metrics import log_business_metrics, log_performance_metrics, log_export_metrics, BusinessMetrics, calculate_business_metrics
from ..services.firestore_optimization import FirestoreOptimizer


router = APIRouter(prefix="/shops", tags=["shops"]) 


@router.post("", response_model=dict)
def create_shop(payload: ShopCreate, current_user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    data = payload.model_dump()
    # Defaults for Google Sheets linkage
    data.setdefault("spreadsheetId", os.getenv("DEFAULT_SHEET_ID"))
    data.setdefault("sheetName", os.getenv("DEFAULT_SHEET_NAME", "Livraisons"))
    data.update(
        {
            "ownerUid": current_user.user_id,
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat(),
        }
    )

    # Determine caller scope
    roles = set(current_user.roles or [])
    region_id_claim = getattr(current_user, "region_id", None)
    chain_id_claim = getattr(current_user, "chain_id", None)

    # Permission and normalization rules
    if "admin" in roles:
        # Full access; no normalization enforced
        pass
    elif "regionalAdmin" in roles:
        if not region_id_claim:
            raise HTTPException(status_code=403, detail="Regional admin missing regionId claim")
        # Force region to caller's region; allow creating HQ or store of any chain
        data["regionId"] = region_id_claim
    elif "hqAdmin" in roles:
        # hqAdmin can only create stores inside their chain & region
        if not (region_id_claim and chain_id_claim):
            raise HTTPException(status_code=403, detail="HQ admin missing regionId/chainId claims")
        if data.get("shopType") and data.get("shopType") != "store":
            raise HTTPException(status_code=403, detail="HQ admin can only create stores")
        data["shopType"] = "store"
        data["regionId"] = region_id_claim
        data["chainId"] = chain_id_claim
        # Validate parentShopId if provided: must be an HQ of same chain/region
        parent = (data.get("parentShopId") or "").strip()
        if parent:
            ps = db.collection("shops").document(parent).get()
            if not ps.exists:
                raise HTTPException(status_code=400, detail="parentShopId not found")
            psd = ps.to_dict() or {}
            if psd.get("shopType") != "hq" or psd.get("chainId") != chain_id_claim or psd.get("regionId") != region_id_claim:
                raise HTTPException(status_code=400, detail="parentShopId must reference an HQ of your chain and region")
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    doc_ref = db.collection("shops").document()
    doc_ref.set(data)
    return {"id": doc_ref.id}


@router.get("/{shop_id}", response_model=Shop)
def get_shop(shop_id: str, current_user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    snap = db.collection("shops").document(shop_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Shop not found")
    data = snap.to_dict() or {}
    roles = set(current_user.roles or [])
    # regional admin can only access shops in their region
    if "regionalAdmin" in roles:
        region_id = getattr(current_user, "region_id", None)
        if region_id and data.get("regionId") != region_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    # hq admin can only access shops in their region+chain
    if "hqAdmin" in roles:
        region_id = getattr(current_user, "region_id", None)
        chain_id = getattr(current_user, "chain_id", None)
        if (region_id and data.get("regionId") != region_id) or (chain_id and data.get("chainId") != chain_id):
            raise HTTPException(status_code=403, detail="Not authorized")
    return Shop(id=shop_id, **data)


class ShopSummary(BaseModel):
    id: str
    name: str | None = None


class ChainList(BaseModel):
    items: List[str]


@router.get("/chains", response_model=ChainList)
def list_chains(regionId: str | None = None, current_user: CurrentUser = Depends(get_current_user)):
    # Accessible aux admins, regionalAdmin (filtre canton), hqAdmin (filtre canton+enseigne côté appelant)
    if "admin" not in current_user.roles and "regionalAdmin" not in current_user.roles and "hqAdmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    chains: set[str] = set()
    q = db.collection("shops")
    if regionId:
        q = q.where("regionId", "==", regionId)
    for doc in q.stream():
        d = doc.to_dict() or {}
        c = (d.get("chainId") or "").strip()
        if c:
            chains.add(c)
    return ChainList(items=sorted(chains))


class ShopList(BaseModel):
    items: List[ShopSummary]


@router.get("", response_model=List[ShopSummary])
def list_shops(current_user: CurrentUser = Depends(get_current_user)):
    # Admin global, regionalAdmin (par canton) ou hqAdmin (enseigne+canton)
    if "admin" not in current_user.roles and "regionalAdmin" not in current_user.roles and "hqAdmin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin only")
    # Simple cache to limit reads (TTL 10 min)
    import time
    now = time.time()
    cache = getattr(list_shops, "_cache", None)
    if cache and now < cache.get("exp", 0):
        return cache.get("data", [])
    items: List[ShopSummary] = []
    try:
        db = get_db()
        q = db.collection("shops")
        # Préfiltre Firestore quand possible
        region_id = getattr(current_user, "region_id", None)
        chain_id = getattr(current_user, "chain_id", None)
        if "regionalAdmin" in current_user.roles and region_id:
            q = q.where("regionId", "==", region_id)
        # Pour hqAdmin, on filtre en mémoire si nécessaire (évite index composite regionId+chainId)
        for doc in q.stream():
            d = doc.to_dict() or {}
            if "hqAdmin" in current_user.roles:
                if region_id and d.get("regionId") != region_id:
                    continue
                if chain_id and d.get("chainId") != chain_id:
                    continue
            items.append(ShopSummary(id=doc.id, name=d.get("name")))
        setattr(list_shops, "_cache", {"data": items, "exp": now + 600})
    except Exception:
        # On erreur Firestore, retourner le cache si présent
        if cache:
            return cache.get("data", [])
    return items


@router.post("/{shop_id}/sheets/export", response_model=dict)
def export_shop_sheets(shop_id: str, days: int = 31, max_docs: int = 300, current_user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    snap = db.collection("shops").document(shop_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop = snap.to_dict() or {}
    # Only this shop or admin
    shop_data = snap.to_dict() or {}
    if ("admin" not in current_user.roles and current_user.shop_id != shop_id and
        ("regionalAdmin" not in current_user.roles or (getattr(current_user, "region_id", None) and shop_data.get("regionId") != getattr(current_user, "region_id", None))) and
        ("hqAdmin" not in current_user.roles or not (getattr(current_user, "chain_id", None) and getattr(current_user, "region_id", None) and shop_data.get("chainId") == getattr(current_user, "chain_id", None) and shop_data.get("regionId") == getattr(current_user, "region_id", None)))):
        raise HTTPException(status_code=403, detail="Not authorized")
    spreadsheet_id = shop.get("spreadsheetId")
    sheet_name = shop.get("sheetName") or "Livraisons"
    if not spreadsheet_id:
        raise HTTPException(status_code=400, detail="Shop has no spreadsheetId configured")

    # Build rows from this shop's deliveries (limit to recent window to avoid quota)
    headers = [
        "Date", "Heure", "Type", "Client", "Course", "Information", "Tarif", "Quantité", "Total Ticket", "Secteur", "n ticket", "DeliveryId", "ShopId", "ChainId", "RegionId",
        "Fee Total", "Fee Shop", "Fee Authority", "Fee Chain",
    ]
    rows = []
    try:
        if days is None or days <= 0:
            days = 31
    except Exception:
        days = 31
    from datetime import datetime, timezone, timedelta
    lookback = datetime.now(timezone.utc) - timedelta(days=days)
    lookback_iso = lookback.isoformat().replace("+00:00", "Z")

    error_msg = None
    try:
        if max_docs is None or max_docs <= 0:
            max_docs = 300
        # Avoid composite-index requirement: query by time window only, filter by shop in memory
        deliveries_ref = (
            db.collection("deliveries")
            .where("startWindow", ">=", lookback_iso)
            .order_by("startWindow")
            .limit(max_docs)
        )
        client_cache: dict[str, dict] = {}
        for doc in deliveries_ref.stream():
            d = doc.to_dict() or {}
            if d.get("shopId") != shop_id:
                continue
            date_str = ""
            time_str = ""
            if d.get("startWindow"):
                try:
                    dt = datetime.fromisoformat(d["startWindow"].replace("Z", "+00:00"))
                    # Force text in Sheets to preserve display format
                    date_str = "'" + dt.strftime("%d.%m.%Y")
                    time_str = "'" + dt.strftime("%H:%M")
                except Exception:
                    pass
            client_name = shop.get("name") or shop_id
            course_name = f"{client_name} - DD"
            info_parts = []
            # Reconstitute client details from clients collection (deliveries may not embed them)
            try:
                client_id = d.get("clientId")
                client_info = {}
                if client_id:
                    if client_id in client_cache:
                        client_info = client_cache[client_id]
                    else:
                        snap = db.collection("clients").document(client_id).get()
                        client_info = snap.to_dict() or {}
                        client_cache[client_id] = client_info
                addr = client_info.get("address") or {}
                if addr:
                    info_parts.append(f"{addr.get('street','')} {addr.get('streetNumber','')} {addr.get('zip','')} {addr.get('city','')}")
                if client_info.get("floor"):
                    info_parts.append(f"Etage: {client_info['floor']}")
                if client_info.get("entryCode"):
                    info_parts.append(f"Code: {client_info['entryCode']}")
                if client_info.get("phone"):
                    info_parts.append(f"Tél: {client_info['phone']}")
            except Exception:
                pass
            information = " ".join(p for p in info_parts if p.strip())
            # Determine tarif from client if not present on delivery
            cms_flag = d.get("cms")
            if cms_flag is None and 'client_info' in locals():
                cms_flag = bool(client_info.get("cms"))
            tarif = "CMS" if cms_flag else "DringDring"
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
                d.get("id", doc.id),
                shop_id,
                (shop.get("chainId") if shop else "") or "",
                (shop.get("regionId") if shop else "") or "",
                d.get("fee", ""),
                (d.get("feeSplit") or {}).get("shop", ""),
                (d.get("feeSplit") or {}).get("authority", ""),
                (d.get("feeSplit") or {}).get("chain", ""),
            ])
    except Exception as exc:
        error_msg = str(exc)

    try:
        upsert_sheet(spreadsheet_id, sheet_name, headers, rows)
        return {"ok": error_msg is None, "rows": len(rows), **({"error": error_msg} if error_msg else {})}
    except Exception as exc:
        # Fail-soft to avoid 500 to the browser; report error in body
        return {"ok": False, "rows": len(rows), "error": str(exc)}


@router.patch("/{shop_id}", response_model=Shop)
def update_shop(shop_id: str, payload: dict, current_user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    ref = db.collection("shops").document(shop_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Shop not found")
    existing = snap.to_dict() or {}
    roles = set(current_user.roles or [])

    # Scope checks
    if "admin" in roles:
        role_allowed_fields = {"name", "address", "email", "phone", "contacts", "departments", "spreadsheetId", "sheetName", "regionId", "chainId", "chainName", "shopType", "parentShopId", "pricing"}
    elif "regionalAdmin" in roles:
        region_id = getattr(current_user, "region_id", None)
        if region_id and existing.get("regionId") != region_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        # Regional admins cannot change region/chain topology fields
        role_allowed_fields = {"name", "address", "email", "phone", "contacts", "departments", "spreadsheetId", "sheetName", "pricing"}
    elif "hqAdmin" in roles:
        region_id = getattr(current_user, "region_id", None)
        chain_id = getattr(current_user, "chain_id", None)
        if (region_id and existing.get("regionId") != region_id) or (chain_id and existing.get("chainId") != chain_id):
            raise HTTPException(status_code=403, detail="Not authorized")
        # HQ admins can change operational/display settings, not topology
        role_allowed_fields = {"name", "address", "email", "phone", "contacts", "departments", "spreadsheetId", "sheetName", "pricing"}
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = {k: v for k, v in (payload or {}).items() if k in role_allowed_fields}
    # Normalize immutable fields for non-admins
    if "admin" not in roles:
        # Prevent accidental changes via payload
        for imm in ["regionId", "chainId", "shopType", "parentShopId", "chainName"]:
            if imm in update_data:
                update_data.pop(imm, None)
    update_data["updatedAt"] = datetime.utcnow().isoformat()
    if not update_data:
        return Shop(id=shop_id, **(ref.get().to_dict() or {}))
    ref.update(update_data)
    data = ref.get().to_dict() or {}
    return Shop(id=shop_id, **data)


@router.get("/{shop_id}/dashboard", response_model=dict)
def get_shop_dashboard(shop_id: str, force: bool = False, current_user: CurrentUser = Depends(get_current_user)):
    start_time = time.perf_counter()
    
    # Only this shop or admin
    if "admin" not in current_user.roles and current_user.shop_id != shop_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db = get_db()
    
    # Cache 60s par shop
    import time
    cache = getattr(get_shop_dashboard, "_cache", {})
    now = time.time()
    if not force and shop_id in cache:
        val, exp = cache[shop_id]
        if now < exp:
            return val
    now = datetime.now(timezone.utc)
    start_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    start_week = start_day - timedelta(days=start_day.weekday())  # Monday
    start_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    def parse_dt(iso: str | None) -> datetime | None:
        if not iso:
            return None
        try:
            return datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except Exception:
            return None

    # Aggregate over recent deliveries (limit range to last 31 days for performance)
    lookback = start_month - timedelta(days=1)  # include a bit before month start
    lookback_iso = lookback.isoformat().replace("+00:00", "Z")
    totals = {
        "today": {"deliveries": 0, "totalBags": 0, "totalAmount": 0.0, "totalFees": 0.0, "shopFees": 0.0, "authorityFees": 0.0, "chainFees": 0.0},
        "week": {"deliveries": 0, "totalBags": 0, "totalAmount": 0.0, "totalFees": 0.0, "shopFees": 0.0, "authorityFees": 0.0, "chainFees": 0.0},
        "month": {"deliveries": 0, "totalBags": 0, "totalAmount": 0.0, "totalFees": 0.0, "shopFees": 0.0, "authorityFees": 0.0, "chainFees": 0.0},
    }
    emp_count: dict[str, int] = {}
    sec_count: dict[str, int] = {}

    try:
        # Restrict read volume: recent deliveries; avoid composite index by filtering shopId in memory
        q = (
            db.collection("deliveries")
            .where("startWindow", ">=", lookback_iso)
            .order_by("startWindow")
        )
        for doc in q.stream():
            d = doc.to_dict() or {}
            if d.get("shopId") != shop_id:
                continue
            dt = parse_dt(d.get("startWindow"))
            if not dt:
                continue
            if dt < lookback:
                continue
            try:
                bags = int(d.get("bags", 0) or 0)
            except Exception:
                bags = 0
            try:
                amount = float(d.get("amount", 0) or 0)
            except Exception:
                amount = 0.0
            # Extract fee data
            try:
                fee_total = float(d.get("fee", 0) or 0)
            except Exception:
                fee_total = 0.0
            fee_split = d.get("feeSplit") or {}
            try:
                fee_shop = float(fee_split.get("shop", 0) or 0)
            except Exception:
                fee_shop = 0.0
            try:
                fee_authority = float(fee_split.get("authority", 0) or 0)
            except Exception:
                fee_authority = 0.0
            try:
                fee_chain = float(fee_split.get("chain", 0) or 0)
            except Exception:
                fee_chain = 0.0
            
            if dt >= start_month:
                totals["month"]["deliveries"] += 1
                totals["month"]["totalBags"] += bags
                totals["month"]["totalAmount"] += amount
                totals["month"]["totalFees"] += fee_total
                totals["month"]["shopFees"] += fee_shop
                totals["month"]["authorityFees"] += fee_authority
                totals["month"]["chainFees"] += fee_chain
            if dt >= start_week:
                totals["week"]["deliveries"] += 1
                totals["week"]["totalBags"] += bags
                totals["week"]["totalAmount"] += amount
                totals["week"]["totalFees"] += fee_total
                totals["week"]["shopFees"] += fee_shop
                totals["week"]["authorityFees"] += fee_authority
                totals["week"]["chainFees"] += fee_chain
            if dt >= start_day:
                totals["today"]["deliveries"] += 1
                totals["today"]["totalBags"] += bags
                totals["today"]["totalAmount"] += amount
                totals["today"]["totalFees"] += fee_total
                totals["today"]["shopFees"] += fee_shop
                totals["today"]["authorityFees"] += fee_authority
                totals["today"]["chainFees"] += fee_chain
            emp = (d.get("employee") or "").strip()
            if emp:
                emp_count[emp] = emp_count.get(emp, 0) + 1
            sec = (d.get("sector") or "").strip()
            if sec:
                sec_count[sec] = sec_count.get(sec, 0) + 1
    except Exception:
        # fail-soft: return zeros to frontend instead of 500
        pass

    def top_n(counter: dict[str, int], n: int = 5):
        return [{"name": k, "deliveries": v} for k, v in sorted(counter.items(), key=lambda x: x[1], reverse=True)[:n]]

    result = {
        **totals,
        "topEmployees": top_n(emp_count),
        "topSectors": top_n(sec_count),
        "lastUpdated": now.isoformat(),
    }
    
    # Calculate and log business metrics
    try:
        # Get deliveries data for metrics calculation
        deliveries_data = []
        for doc in q.stream():
            d = doc.to_dict() or {}
            if d.get("shopId") == shop_id:
                deliveries_data.append(d)
        
        # Calculate metrics for each period
        today_deliveries = [d for d in deliveries_data if parse_dt(d.get("startWindow")) and parse_dt(d.get("startWindow")) >= start_day]
        week_deliveries = [d for d in deliveries_data if parse_dt(d.get("startWindow")) and parse_dt(d.get("startWindow")) >= start_week]
        month_deliveries = [d for d in deliveries_data if parse_dt(d.get("startWindow")) and parse_dt(d.get("startWindow")) >= start_month]
        
        # Log business metrics
        if today_deliveries:
            today_metrics = calculate_business_metrics(today_deliveries, "today")
            log_business_metrics(today_metrics, shop_id=shop_id)
        
        if week_deliveries:
            week_metrics = calculate_business_metrics(week_deliveries, "week")
            log_business_metrics(week_metrics, shop_id=shop_id)
        
        if month_deliveries:
            month_metrics = calculate_business_metrics(month_deliveries, "month")
            log_business_metrics(month_metrics, shop_id=shop_id)
            
    except Exception as e:
        # Log error but don't fail the dashboard
        pass
    
    # Log performance metrics
    duration_ms = (time.perf_counter() - start_time) * 1000
    log_performance_metrics(
        operation="get_shop_dashboard",
        duration_ms=duration_ms,
        shop_id=shop_id
    )
    
    try:
        cache[shop_id] = (result, now + 60)
        setattr(get_shop_dashboard, "_cache", cache)
    except Exception:
        pass
    return result


@router.get("/{shop_id}/export.csv")
def export_csv(shop_id: str, days: int = 31, current_user: CurrentUser = Depends(get_current_user)):
    start_time = time.perf_counter()
    
    # Only this shop or admin
    if "admin" not in current_user.roles and current_user.shop_id != shop_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db = get_db()
    # time window
    now = datetime.now(timezone.utc)
    lookback = now - timedelta(days=days)
    lookback_iso = lookback.isoformat().replace("+00:00", "Z")

    # Query by startWindow then filter by shop to avoid composite index
    q = (
        db.collection("deliveries")
        .where("startWindow", ">=", lookback_iso)
        .order_by("startWindow")
    )
    rows: list[list[str]] = []
    client_cache: dict[str, dict] = {}
    for doc in q.stream():
        d = doc.to_dict() or {}
        if d.get("shopId") != shop_id:
            continue
        sw = d.get("startWindow")
        try:
            dt = datetime.fromisoformat((sw or "").replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
            time_str = dt.strftime("%H:%M")
        except Exception:
            date_str = sw or ""
            time_str = ""
        client_info = {}
        cid = d.get("clientId")
        if cid:
            if cid in client_cache:
                client_info = client_cache[cid]
            else:
                snap = db.collection("clients").document(cid).get()
                client_info = snap.to_dict() or {}
                client_cache[cid] = client_info
        addr = client_info.get("address") or {}
        address_line = f"{addr.get('street','')} {addr.get('streetNumber','')} {addr.get('zip','')} {addr.get('city','')}".strip()
        rows.append([
            d.get("id", doc.id),
            date_str,
            time_str,
            (client_info.get("firstName") or "") + " " + (client_info.get("lastName") or ""),
            address_line,
            client_info.get("phone") or "",
            str(d.get("bags", "")),
            d.get("employee") or "",
            d.get("sector") or "",
            d.get("ticketNo") or "",
            str(d.get("amount", "")),
            str(d.get("fee", "")),
            str((d.get("feeSplit") or {}).get("shop", "")),
            str((d.get("feeSplit") or {}).get("authority", "")),
            str((d.get("feeSplit") or {}).get("chain", "")),
            "Oui" if d.get("cms") else "Non",
        ])

    # Build CSV
    headers = [
        "DeliveryId","Date","Heure","Client","Adresse","Téléphone","Sacs","Employé","Secteur","Ticket","Montant",
        "Fee Total","Fee Shop","Fee Authority","Fee Chain","CMS"
    ]
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    writer.writerows(rows)
    buf.seek(0)
    filename = f"export_{shop_id}.csv"
    
    # Log export metrics
    duration_ms = (time.perf_counter() - start_time) * 1000
    log_export_metrics(
        export_type="shop_csv",
        record_count=len(rows),
        duration_ms=duration_ms,
        shop_id=shop_id
    )
    
    return StreamingResponse(buf, media_type="text/csv", headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })


class HqExportRequest(BaseModel):
    spreadsheetId: str
    sheetName: str = "Livraisons"


def _assert_hq_access(current_user: CurrentUser, chain_id: str, region_id: str):
    if "admin" in current_user.roles:
        return
    if "hqAdmin" in current_user.roles and getattr(current_user, "chain_id", None) == chain_id and getattr(current_user, "region_id", None) == region_id:
        return
    if "regionalAdmin" in current_user.roles and getattr(current_user, "region_id", None) == region_id:
        # regional admin peut voir toutes enseignes de sa région
        return
    raise HTTPException(status_code=403, detail="Not authorized")


@router.get("/chains/{chain_id}/regions/{region_id}/dashboard", response_model=dict)
def hq_dashboard(chain_id: str, region_id: str, current_user: CurrentUser = Depends(get_current_user)):
    _assert_hq_access(current_user, chain_id, region_id)
    db = get_db()
    # Récupère les shops de l'enseigne dans la région
    shop_ids: list[str] = []
    for s in db.collection("shops").where("chainId", "==", chain_id).where("regionId", "==", region_id).stream():
        shop_ids.append(s.id)
    import time
    from datetime import timezone
    now = datetime.now(timezone.utc)
    start_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    start_week = start_day - timedelta(days=start_day.weekday())
    start_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    lookback = start_month - timedelta(days=1)
    lookback_iso = lookback.isoformat().replace("+00:00", "Z")
    totals = {"today": {"deliveries": 0, "totalBags": 0, "totalAmount": 0.0, "totalFees": 0.0, "shopFees": 0.0, "authorityFees": 0.0, "chainFees": 0.0},
              "week": {"deliveries": 0, "totalBags": 0, "totalAmount": 0.0, "totalFees": 0.0, "shopFees": 0.0, "authorityFees": 0.0, "chainFees": 0.0},
              "month": {"deliveries": 0, "totalBags": 0, "totalAmount": 0.0, "totalFees": 0.0, "shopFees": 0.0, "authorityFees": 0.0, "chainFees": 0.0}}
    emp_count: dict[str, int] = {}
    sec_count: dict[str, int] = {}
    try:
        q = db.collection("deliveries").where("startWindow", ">=", lookback_iso).order_by("startWindow")
        for doc in q.stream():
            d = doc.to_dict() or {}
            if shop_ids and d.get("shopId") not in shop_ids:
                continue
            try:
                dt = datetime.fromisoformat((d.get("startWindow") or "").replace("Z", "+00:00"))
            except Exception:
                continue
            if dt < lookback:
                continue
            bags = int(d.get("bags", 0) or 0)
            amount = float(d.get("amount", 0) or 0)
            # Extract fee data
            try:
                fee_total = float(d.get("fee", 0) or 0)
            except Exception:
                fee_total = 0.0
            fee_split = d.get("feeSplit") or {}
            try:
                fee_shop = float(fee_split.get("shop", 0) or 0)
            except Exception:
                fee_shop = 0.0
            try:
                fee_authority = float(fee_split.get("authority", 0) or 0)
            except Exception:
                fee_authority = 0.0
            try:
                fee_chain = float(fee_split.get("chain", 0) or 0)
            except Exception:
                fee_chain = 0.0
            
            if dt >= start_month:
                totals["month"]["deliveries"] += 1; totals["month"]["totalBags"] += bags; totals["month"]["totalAmount"] += amount
                totals["month"]["totalFees"] += fee_total; totals["month"]["shopFees"] += fee_shop; totals["month"]["authorityFees"] += fee_authority; totals["month"]["chainFees"] += fee_chain
            if dt >= start_week:
                totals["week"]["deliveries"] += 1; totals["week"]["totalBags"] += bags; totals["week"]["totalAmount"] += amount
                totals["week"]["totalFees"] += fee_total; totals["week"]["shopFees"] += fee_shop; totals["week"]["authorityFees"] += fee_authority; totals["week"]["chainFees"] += fee_chain
            if dt >= start_day:
                totals["today"]["deliveries"] += 1; totals["today"]["totalBags"] += bags; totals["today"]["totalAmount"] += amount
                totals["today"]["totalFees"] += fee_total; totals["today"]["shopFees"] += fee_shop; totals["today"]["authorityFees"] += fee_authority; totals["today"]["chainFees"] += fee_chain
            emp = (d.get("employee") or "").strip(); sec = (d.get("sector") or "").strip()
            if emp: emp_count[emp] = emp_count.get(emp, 0) + 1
            if sec: sec_count[sec] = sec_count.get(sec, 0) + 1
    except Exception:
        pass
    def top_n(counter: dict[str, int], n: int = 5):
        return [{"name": k, "deliveries": v} for k, v in sorted(counter.items(), key=lambda x: x[1], reverse=True)[:n]]
    return {**totals, "topEmployees": top_n(emp_count), "topSectors": top_n(sec_count), "lastUpdated": now.isoformat()}


@router.get("/chains/{chain_id}/regions/{region_id}/billing/export.csv")
def hq_billing_export(chain_id: str, region_id: str, start_date: str, end_date: str, current_user: CurrentUser = Depends(get_current_user)):
    """Export billing data for HQ with fee breakdowns and aggregations"""
    start_time = time.perf_counter()
    
    _assert_hq_access(current_user, chain_id, region_id)
    db = get_db()
    
    # Parse dates
    try:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD)")
    
    # Get shops in chain/region
    shop_ids: list[str] = []
    shop_names: dict[str, str] = {}
    for s in db.collection("shops").where("chainId", "==", chain_id).where("regionId", "==", region_id).stream():
        shop_ids.append(s.id)
        shop_names[s.id] = s.to_dict().get("name", "")
    
    # Build CSV with billing data
    headers = [
        "Date", "Shop", "Deliveries", "Total Bags", "Total Amount", 
        "Total Fees", "Shop Fees", "Authority Fees", "Chain Fees", "CMS Deliveries"
    ]
    
    # Aggregate by date and shop
    daily_totals: dict[str, dict] = {}
    
    try:
        q = db.collection("deliveries").where("startWindow", ">=", start_dt.isoformat()).where("startWindow", "<=", end_dt.isoformat()).order_by("startWindow")
        for doc in q.stream():
            d = doc.to_dict() or {}
            if d.get("shopId") not in shop_ids:
                continue
                
            try:
                dt = datetime.fromisoformat((d.get("startWindow") or "").replace("Z", "+00:00"))
            except Exception:
                continue
                
            date_key = dt.strftime("%Y-%m-%d")
            shop_id = d.get("shopId")
            key = f"{date_key}_{shop_id}"
            
            if key not in daily_totals:
                daily_totals[key] = {
                    "date": date_key,
                    "shop": shop_names.get(shop_id, ""),
                    "deliveries": 0,
                    "bags": 0,
                    "amount": 0.0,
                    "fees": 0.0,
                    "shop_fees": 0.0,
                    "authority_fees": 0.0,
                    "chain_fees": 0.0,
                    "cms_deliveries": 0
                }
            
            daily_totals[key]["deliveries"] += 1
            daily_totals[key]["bags"] += int(d.get("bags", 0) or 0)
            daily_totals[key]["amount"] += float(d.get("amount", 0) or 0)
            daily_totals[key]["fees"] += float(d.get("fee", 0) or 0)
            
            fee_split = d.get("feeSplit") or {}
            daily_totals[key]["shop_fees"] += float(fee_split.get("shop", 0) or 0)
            daily_totals[key]["authority_fees"] += float(fee_split.get("authority", 0) or 0)
            daily_totals[key]["chain_fees"] += float(fee_split.get("chain", 0) or 0)
            
            if d.get("cms"):
                daily_totals[key]["cms_deliveries"] += 1
                
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(exc)}")
    
    # Build CSV rows
    rows = []
    for data in sorted(daily_totals.values(), key=lambda x: (x["date"], x["shop"])):
        rows.append([
            data["date"],
            data["shop"],
            str(data["deliveries"]),
            str(data["bags"]),
            f"{data['amount']:.2f}",
            f"{data['fees']:.2f}",
            f"{data['shop_fees']:.2f}",
            f"{data['authority_fees']:.2f}",
            f"{data['chain_fees']:.2f}",
            str(data["cms_deliveries"])
        ])
    
    # Add summary row
    if rows:
        total_deliveries = sum(int(row[2]) for row in rows)
        total_bags = sum(int(row[3]) for row in rows)
        total_amount = sum(float(row[4]) for row in rows)
        total_fees = sum(float(row[5]) for row in rows)
        total_shop_fees = sum(float(row[6]) for row in rows)
        total_authority_fees = sum(float(row[7]) for row in rows)
        total_chain_fees = sum(float(row[8]) for row in rows)
        total_cms = sum(int(row[9]) for row in rows)
        
        rows.append([
            "TOTAL",
            "",
            str(total_deliveries),
            str(total_bags),
            f"{total_amount:.2f}",
            f"{total_fees:.2f}",
            f"{total_shop_fees:.2f}",
            f"{total_authority_fees:.2f}",
            f"{total_chain_fees:.2f}",
            str(total_cms)
        ])
    
    # Create CSV
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    writer.writerows(rows)
    buf.seek(0)
    
    filename = f"billing_{chain_id}_{region_id}_{start_date}_{end_date}.csv"
    
    # Log export metrics
    duration_ms = (time.perf_counter() - start_time) * 1000
    log_export_metrics(
        export_type="billing_csv",
        record_count=len(rows),
        duration_ms=duration_ms,
        chain_id=chain_id,
        region_id=region_id
    )
    
    return StreamingResponse(buf, media_type="text/csv", headers={
        "Content-Disposition": f"attachment; filename={filename}"
    })


@router.post("/chains/{chain_id}/regions/{region_id}/sheets/export", response_model=dict)
def hq_export(chain_id: str, region_id: str, payload: HqExportRequest, days: int = 31, current_user: CurrentUser = Depends(get_current_user)):
    _assert_hq_access(current_user, chain_id, region_id)
    db = get_db()
    # liste des shops concernés
    shop_ids: list[str] = []
    for s in db.collection("shops").where("chainId", "==", chain_id).where("regionId", "==", region_id).stream():
        shop_ids.append(s.id)
    headers = ["Date","Heure","Type","Client","Course","Information","Tarif","Quantité","Total Ticket","Secteur","n ticket","DeliveryId","ShopId","ChainId","RegionId"]
    rows: list[list[str]] = []
    try:
        if not days or days <= 0: days = 31
    except Exception:
        days = 31
    lookback = datetime.now(timezone.utc) - timedelta(days=days)
    lookback_iso = lookback.isoformat().replace("+00:00", "Z")
    q = db.collection("deliveries").where("startWindow", ">=", lookback_iso).order_by("startWindow")
    for doc in q.stream():
        d = doc.to_dict() or {}
        if shop_ids and d.get("shopId") not in shop_ids:
            continue
        date_str = ""; time_str = ""
        if d.get("startWindow"):
            try:
                dt = datetime.fromisoformat(d["startWindow"].replace("Z", "+00:00"))
                date_str = dt.strftime("%d.%m.%Y"); time_str = dt.strftime("%H:%M")
            except Exception:
                pass
        info_parts = []
        addr = d.get("clientAddress") or {}
        if addr:
            info_parts.append(f"{addr.get('street','')} {addr.get('streetNumber','')} {addr.get('zip','')} {addr.get('city','')}")
        if d.get("clientFloor"): info_parts.append(f"Etage: {d['clientFloor']}")
        if d.get("clientEntryCode"): info_parts.append(f"Code: {d['clientEntryCode']}")
        if d.get("clientPhone"): info_parts.append(f"Tél: {d['clientPhone']}")
        information = " ".join(p for p in info_parts if p.strip())
        tarif = "CMS" if d.get("cms") else "DringDring"
        rows.append([date_str, time_str, "DringDring", chain_id.upper(), f"{chain_id} - HQ", information, tarif, d.get("bags",0), d.get("amount",""), d.get("sector",""), d.get("ticketNo",""), d.get("id", doc.id), d.get("shopId",""), chain_id, region_id])
    upsert_sheet(payload.spreadsheetId, payload.sheetName, headers, rows)
    return {"ok": True, "rows": len(rows)}

