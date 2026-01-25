from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import uuid
from typing import Optional

from app.core.guards import require_super_admin_user, require_admin_user
from app.core.security import get_current_user_claims
from app.db.session import get_db_connection
from app.schemas.me import MeResponse

router = APIRouter(prefix="/regions", tags=["regions"])

class AdminRegionCreate(BaseModel):
    name: str
    canton_id: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    active: bool = True

@router.get("/cantons")
def list_cantons(
    user: MeResponse = Depends(require_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, code FROM canton ORDER BY name")
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

    results = []
    for row in rows:
        item = {}
        for col, val in zip(columns, row):
            item[col] = val
        results.append(item)
    return results

@router.get("")
def list_admin_regions(
    user: MeResponse = Depends(require_super_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ar.id, ar.name, ar.active, ar.address, ar.contact_email, ar.contact_person, ar.phone,
                       c.name as canton_name
                FROM admin_region ar
                LEFT JOIN canton c ON ar.canton_id = c.id
                ORDER BY ar.name
                """
            )
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

    results = []
    for row in rows:
        item = {}
        for col, val in zip(columns, row):
            item[col] = val
        results.append(item)
    return results

@router.post("")
def create_admin_region(
    region: AdminRegionCreate,
    user: MeResponse = Depends(require_super_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    region_id = str(uuid.uuid4())
    
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            # Verify canton if provided
            canton_id_to_use = None
            if region.canton_id:
                cur.execute("SELECT id FROM canton WHERE id = %s", (region.canton_id,))
                if not cur.fetchone():
                     raise HTTPException(status_code=400, detail="Canton not found")
                canton_id_to_use = region.canton_id
            
            cur.execute(
                """
                INSERT INTO admin_region (id, name, canton_id, address, contact_email, contact_person, phone, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (region_id, region.name, canton_id_to_use, region.address, region.contact_email, region.contact_person, region.phone, region.active)
            )
            conn.commit()
            
    return {"id": region_id, "message": "Admin Region created successfully"}
