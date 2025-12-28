from fastapi import APIRouter, Depends, HTTPException

from app.core.guards import require_shop_user, require_admin_user
from app.core.security import get_current_user_claims
from app.db.session import get_db_connection
from app.schemas.me import MeResponse
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("/shop")
def list_shop_clients(
    user: MeResponse = Depends(require_shop_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    shop_id = user.shop_id
    if not shop_id:
        raise HTTPException(status_code=400, detail="Shop id missing")

    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT city_id
                FROM shop
                WHERE id = %s
                """,
                (shop_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Shop not found")
            city_id = row[0]

            cur.execute(
                """
                SELECT id, name, address, postal_code, city_name, is_cms
                FROM client
                WHERE city_id = %s
                  AND active = true
                ORDER BY name
                """,
                (city_id,),
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


@router.get("/admin")
def list_admin_clients(
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
                SELECT c.id, c.name, c.address, c.postal_code, c.city_name, c.is_cms, city.name as city_real_name
                FROM client c
                JOIN city ON c.city_id = city.id
                WHERE city.admin_region_id = %s
                ORDER BY c.name
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
    return results


class ClientCreate(BaseModel):
    name: str
    address: str
    postal_code: str
    city_id: str
    is_cms: bool = False

@router.post("")
def create_client(
    client: ClientCreate,
    user: MeResponse = Depends(require_admin_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    admin_region_id = user.admin_region_id
    if not admin_region_id:
        raise HTTPException(status_code=400, detail="Admin region id missing")

    # Verify city belongs to admin region
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT admin_region_id FROM city WHERE id = %s",
                (client.city_id,)
            )
            row = cur.fetchone()
            if not row or str(row[0]) != str(admin_region_id):
                 raise HTTPException(status_code=403, detail="City does not belong to your region")
            
            client_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO client (id, name, address, postal_code, city_name, city_id, is_cms, active)
                VALUES (%s, %s, %s, %s, (SELECT name FROM city WHERE id = %s), %s, %s, true)
                RETURNING id
                """,
                (client_id, client.name, client.address, client.postal_code, client.city_id, client.city_id, client.is_cms)
            )
            
    return {"id": client_id, "message": "Client created successfully"}


