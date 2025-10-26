from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List
import csv
import io
import re
import os
from datetime import datetime
import time

from ..dependencies.auth import get_current_user, CurrentUser
from ..schemas.clients import Client, ClientCreate
from ..services.db import get_db


router = APIRouter(prefix="/clients", tags=["clients"]) 

# In-memory client search index
_client_index: list[dict] = []
_client_index_loaded_at: float | None = None

def _normalize_ws(value: str) -> str:
    return " ".join((value or "").strip().split())

def _build_index_from_firestore() -> None:
    global _client_index, _client_index_loaded_at
    db = get_db()
    items: list[dict] = []
    for doc in db.collection("clients").stream():
        data = doc.to_dict() or {}
        items.append({
            "id": doc.id,
            "firstLower": _normalize_ws((data.get("firstName") or "").lower()),
            "lastLower": _normalize_ws((data.get("lastName") or "").lower()),
            "doc": data,
        })
    _client_index = items
    _client_index_loaded_at = time.time()


@router.on_event("startup")
def _warmup_client_index() -> None:
    try:
        _build_index_from_firestore()
    except Exception:
        # best-effort: index will be built on first request
        pass


@router.post("", response_model=dict)
def create_client(payload: ClientCreate, current_user: CurrentUser = Depends(get_current_user)):
    if "admin" not in current_user.roles and "shop" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    db = get_db()
    data = payload.model_dump()
    data.update({"createdAt": datetime.utcnow().isoformat(), "createdBy": current_user.user_id})
    doc_ref = db.collection("clients").document()
    doc_ref.set(data)
    return {"id": doc_ref.id}


@router.get("/{client_id}", response_model=Client)
def get_client(client_id: str, current_user: CurrentUser = Depends(get_current_user)):
    db = get_db()
    snap = db.collection("clients").document(client_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Client not found")
    data = snap.to_dict() or {}
    return Client(id=client_id, **data)


@router.get("", response_model=List[Client])
def search_clients(query: str = Query(""), current_user: CurrentUser = Depends(get_current_user)):
    q = (query or "").strip().lower()
    # Avoid expensive scans for single-character queries
    if len(q) < 2:
        return []
    # Ensure index is fresh (refresh every 10 minutes)
    index_ok = False
    try:
        if _client_index_loaded_at is None or (time.time() - (_client_index_loaded_at or 0)) > 600:
            _build_index_from_firestore()
        index_ok = len(_client_index) > 0
    except Exception:
        index_ok = False
    # Search in memory if available
    cap = 20
    out: list[Client] = []
    if index_ok:
        for item in _client_index:
            if q in item["firstLower"] or q in item["lastLower"]:
                out.append(Client(id=item["id"], **(item["doc"])) )
                if len(out) >= cap:
                    break
        return out
    # Fallback: light Firestore prefix queries (cap total)
    try:
        db = get_db()
        remaining = cap
        for field in ("lastName", "firstName"):
            if remaining <= 0:
                break
            qref = (
                db.collection("clients")
                .order_by(field)
                .start_at([q])
                .end_at([q + "\uf8ff"])  # prefix
                .limit(remaining)
            )
            for doc in qref.stream():
                data = doc.to_dict() or {}
                # dedupe
                if any(x.id == doc.id for x in out):
                    continue
                out.append(Client(id=doc.id, **data))
                remaining -= 1
                if remaining <= 0:
                    break
    except Exception:
        pass
    return out


@router.post("/import", response_model=dict)
def import_clients(
    file: UploadFile = File(...),
    dryRun: bool = False,
    mergeMissingOnly: bool = True,
    current_user: CurrentUser = Depends(get_current_user),
):
    if "admin" not in current_user.roles and "shop" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Not authorized")
    db = get_db()

    content_bytes = file.file.read()
    try:
        text = content_bytes.decode("utf-8-sig", errors="ignore")
    except Exception:
        text = content_bytes.decode("utf-8", errors="ignore")

    reader = csv.DictReader(io.StringIO(text))

    def get_col(row: dict, names: List[str]) -> str:
        for n in names:
            if n in row and row[n] is not None and str(row[n]).strip() != "":
                return str(row[n]).strip()
        return ""

    created = 0
    updated = 0
    skipped = 0
    errors: List[str] = []
    def normalize_ws(value: str) -> str:
        return " ".join((value or "").strip().split())

    def titlecase(value: str) -> str:
        v = normalize_ws(value)
        return v.title()

    def phone_key_from_formatted(formatted: str | None) -> str | None:
        if not formatted:
            return None
        # digits only key, e.g. +41 27 322 60 22 -> 41273226022
        digits = re.sub(r"\D", "", formatted)
        return digits or None

    # Build in-memory indexes for dedup (phone and dedupeKey)
    existing_docs = list(db.collection("clients").stream())
    phone_to_id: dict[str, str] = {}
    key_to_id: dict[str, str] = {}
    id_to_doc: dict[str, dict] = {}
    for d in existing_docs:
        data = d.to_dict() or {}
        cid = d.id
        id_to_doc[cid] = data
        pkey = phone_key_from_formatted(data.get("phone"))
        if pkey:
            phone_to_id.setdefault(pkey, cid)
        # Build dedupe key from normalized name + address + zip
        k = "|".join(
            [
                normalize_ws((data.get("lastName") or "").lower()),
                normalize_ws((data.get("firstName") or "").lower()),
                normalize_ws(((data.get("address") or {}).get("street") or "").lower()),
                normalize_ws(((data.get("address") or {}).get("streetNumber") or "").lower()),
                normalize_ws(((data.get("address") or {}).get("zip") or "").lower()),
            ]
        )
        if k.strip("|"):
            key_to_id.setdefault(k, cid)

    def normalize_ch_phone(raw: str | None) -> str | None:
        if not raw:
            return None
        # keep only digits and plus
        s = str(raw).strip()
        digits = re.sub(r"[^0-9+]", "", s)
        # Convert various international prefixes to +41
        if digits.startswith("0041"):
            digits = "+41" + digits[4:]
        # If already +41, keep
        if digits.startswith("+41"):
            nsn = re.sub(r"\D", "", digits[3:])  # national significant number
        else:
            only = re.sub(r"\D", "", digits)
            # If starts with 0 and length >= 10, drop leading 0
            if only.startswith("0") and len(only) >= 10:
                nsn = only[1:]
            # If 9 digits, assume missing leading 0 already dropped
            elif len(only) == 9:
                nsn = only
            else:
                # Not a recognizable Swiss length
                return None
            digits = "+41" + nsn
        # Ensure we have exactly 9 digits after country code
        nsn = re.sub(r"\D", "", digits[3:])
        if len(nsn) != 9:
            return None
        # Format as +41 XX XXX XX XX
        g1, g2, g3, g4 = nsn[:2], nsn[2:5], nsn[5:7], nsn[7:9]
        return f"+41 {g1} {g2} {g3} {g4}"

    for idx, row in enumerate(reader, start=2):  # start=2 to account for header being line 1
        full_name = get_col(row, ["Nom Complet", "Nom complet", "Nom", "Nom complet "])
        street = get_col(row, ["Adresse 1", "Adresse", "Adresse1"]) or ""
        street_no = get_col(row, ["Numéro 1", "Numéro", "Numero 1", "Numero"]) or ""
        zip_raw = get_col(row, ["NPA 1", "NPA", "Zip"]) or ""
        city = get_col(row, ["Lieu 1", "Lieu", "Ville"]) or ""
        floor = get_col(row, ["Etage 1", "Etage", "Étage 1", "Étage"]) or None
        entry_code = get_col(row, ["Code entrée", "Code entree", "Code", "Entrée"]) or None
        phone_raw = get_col(row, ["Tél", "Tel", "Téléphone", "Telephone"]) or None
        phone = normalize_ch_phone(phone_raw)
        cms_raw = get_col(row, ["CMS"]) or ""

        # Split full name: last token is lastName, previous join to firstName
        tokens = [t for t in re.split(r"\s+", full_name.strip()) if t]
        if not tokens:
            skipped += 1
            errors.append(f"L{idx}: missing name")
            continue
        if len(tokens) == 1:
            first_name = ""
            last_name = tokens[0]
        else:
            first_name = " ".join(tokens[:-1])
            last_name = tokens[-1]

        # Normalize names and address casing/spaces
        first_name = titlecase(first_name)
        last_name = titlecase(last_name)
        street = titlecase(street)
        street_no = normalize_ws(street_no)
        city = titlecase(city)

        # Normalize ZIP: if missing -> default, else digits must be 4
        zip_digits = re.sub(r"\D", "", zip_raw)
        if not zip_digits:
            zip_digits = os.getenv("DEFAULT_ZIP", "1950")
        elif len(zip_digits) != 4:
            skipped += 1
            errors.append(f"L{idx}: invalid zip '{zip_raw}'")
            continue

        cms = str(cms_raw).strip().lower() in {"oui", "yes", "true", "1"}

        client_doc = {
            "firstName": first_name,
            "lastName": last_name,
            "address": {
                "street": street,
                "streetNumber": street_no,
                "zip": zip_digits,
                "city": city or "",
            },
            "email": None,
            "phone": phone,
            "floor": floor,
            "entryCode": entry_code,
            "cms": cms,
            "createdAt": datetime.utcnow().isoformat(),
            "createdBy": current_user.user_id,
            "phoneNormalized": phone_key_from_formatted(phone),
        }

        try:
            # Validate via pydantic by reusing response model
            _ = Client(**{"id": "tmp", **client_doc})
        except Exception as e:
            skipped += 1
            errors.append(f"L{idx}: validation error: {e}")
            continue

        # Determine existing target by phone or dedupe key
        dedupe_key = "|".join(
            [
                last_name.lower(),
                first_name.lower(),
                (street or "").lower(),
                (street_no or "").lower(),
                zip_digits,
            ]
        )
        target_id = None
        pkey = client_doc.get("phoneNormalized")
        if pkey and pkey in phone_to_id:
            target_id = phone_to_id[pkey]
        elif dedupe_key in key_to_id:
            target_id = key_to_id[dedupe_key]

        if not dryRun:
            try:
                if target_id:
                    # Merge into existing
                    existing = id_to_doc.get(target_id, {})
                    to_update: dict = {"updatedAt": datetime.utcnow().isoformat()}
                    def need(current, incoming):
                        return (current is None or current == "" or current == []) and (incoming not in (None, "", []))
                    if mergeMissingOnly:
                        if need(existing.get("firstName"), first_name):
                            to_update["firstName"] = first_name
                        if need(existing.get("lastName"), last_name):
                            to_update["lastName"] = last_name
                        addr = existing.get("address") or {}
                        addr_update = {}
                        if need(addr.get("street"), street):
                            addr_update["street"] = street
                        if need(addr.get("streetNumber"), street_no):
                            addr_update["streetNumber"] = street_no
                        if need(addr.get("zip"), zip_digits):
                            addr_update["zip"] = zip_digits
                        if need(addr.get("city"), city or ""):
                            addr_update["city"] = city or ""
                        if addr_update:
                            to_update["address"] = {**addr, **addr_update}
                        if need(existing.get("phone"), phone):
                            to_update["phone"] = phone
                            to_update["phoneNormalized"] = pkey
                        if need(existing.get("floor"), floor):
                            to_update["floor"] = floor
                        if need(existing.get("entryCode"), entry_code):
                            to_update["entryCode"] = entry_code
                        if need(existing.get("cms"), cms):
                            to_update["cms"] = cms
                    else:
                        # Full overwrite of user-facing fields
                        to_update.update({
                            "firstName": first_name,
                            "lastName": last_name,
                            "address": client_doc["address"],
                            "phone": phone,
                            "phoneNormalized": pkey,
                            "floor": floor,
                            "entryCode": entry_code,
                            "cms": cms,
                        })
                    if len(to_update) > 1:  # has updates beyond updatedAt
                        db.collection("clients").document(target_id).update(to_update)
                        # refresh caches
                        id_to_doc[target_id] = {**existing, **to_update}
                        updated += 1
                    else:
                        # nothing to change
                        pass
                else:
                    # create new
                    doc_ref = db.collection("clients").document()
                    payload = {k: v for k, v in client_doc.items() if k not in {"id"}}
                    doc_ref.set(payload)
                    created += 1
                    # update caches
                    new_id = doc_ref.id
                    id_to_doc[new_id] = payload
                    if pkey:
                        phone_to_id.setdefault(pkey, new_id)
                    key_to_id.setdefault(dedupe_key, new_id)
            except Exception as e:
                skipped += 1
                errors.append(f"L{idx}: write error: {e}")
        else:
            if target_id:
                updated += 1
            else:
                created += 1

    return {"ok": True, "created": created, "updated": updated, "skipped": skipped, "errors": errors[:20]}

