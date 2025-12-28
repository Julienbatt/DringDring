from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import uuid

from app.core.guards import require_admin_user
from app.core.security import get_current_user_claims
from app.db.session import get_db_connection
from app.schemas.me import MeResponse

router = APIRouter(prefix="/shops", tags=["shops"])

class ShopCreate(BaseModel):
    name: str
    city_id: str
    hq_id: str
    tariff_version_id: str

@router.get("/admin")
def list_admin_shops(
    user: MeResponse = Depends(require_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    admin_region_id = user.admin_region_id
    if not admin_region_id:
        raise HTTPException(status_code=400, detail="Admin region id missing")

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.name, c.name as city_name, h.name as hq_name
                FROM shop s
                JOIN city c ON s.city_id = c.id
                JOIN hq h ON s.hq_id = h.id
                WHERE c.admin_region_id = %s
                ORDER BY s.name
                """,
                (admin_region_id,),
            )
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

    results = []
    for row in rows:
        item = {}
        for col, val in zip(columns, row):
            item[col] = val
        results.append(item)
    for row in rows:
        item = {}
        for col, val in zip(columns, row):
            item[col] = val
        results.append(item)
    return results

@router.get("/hqs")
def list_hqs(
    user: MeResponse = Depends(require_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name FROM hq ORDER BY name")
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
    
    results = []
    for row in rows:
        item = {}
        for col, val in zip(columns, row):
            item[col] = val
        results.append(item)
    return results

@router.get("/tariffs")
def list_tariffs(
    user: MeResponse = Depends(require_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    # Retrieve active tariff versions
    # For now simply list all active ones. 
    # In a real scenario we might filter by city or region.
    # But tariff structure in seed seems to link tariff to city via 'scope_id'
    
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT v.id, t.name, v.rule, v.valid_from 
                FROM tariff_version v
                JOIN tariff t ON v.tariff_id = t.id
                WHERE t.active = true
                ORDER BY t.name
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
def create_shop(
    shop: ShopCreate,
    user: MeResponse = Depends(require_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    # TODO: Verify city belongs to admin region?
    # For now simply insert
    
    shop_id = str(uuid.uuid4())
    
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO shop (id, name, city_id, hq_id, tariff_version_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (shop_id, shop.name, shop.city_id, shop.hq_id, shop.tariff_version_id)
            )
            
    return {"id": shop_id, "message": "Shop created successfully"}
