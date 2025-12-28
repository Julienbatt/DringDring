from fastapi import APIRouter, Depends, HTTPException

from app.core.guards import require_shop_user
from app.core.security import get_current_user_claims
from app.db.session import get_db_connection
from app.schemas.me import MeResponse

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
