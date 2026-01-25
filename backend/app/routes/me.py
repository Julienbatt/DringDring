from fastapi import APIRouter, Depends

from app.core.identity import resolve_identity
from app.core.security import get_current_user, get_current_user_claims
from app.db.session import get_db_connection
from app.schemas.me import MeResponse

router = APIRouter()


@router.get("/me", response_model=MeResponse)
def get_me(
    user=Depends(get_current_user),
    jwt_claims: str = Depends(get_current_user_claims),
) -> MeResponse:
    return resolve_identity(
        user_id=user.user_id,
        email=user.email,
        jwt_claims=jwt_claims,
    )


@router.get("/me/cities")
def get_my_cities(
    user=Depends(get_current_user),
    jwt_claims: str = Depends(get_current_user_claims),
):
    identity = resolve_identity(
        user_id=user.user_id,
        email=user.email,
        jwt_claims=jwt_claims,
    )
    
    cities = []
    
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            if identity.role == "admin_region" and identity.admin_region_id:
                cur.execute(
                    "SELECT id, name FROM city WHERE admin_region_id = %s ORDER BY name",
                    (identity.admin_region_id,)
                )
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                for row in rows:
                    item = {}
                    for col, val in zip(columns, row):
                        item[col] = val
                    cities.append(item)
                    
            elif identity.role == "city" and identity.city_id:
                 cur.execute(
                    "SELECT id, name FROM city WHERE id = %s",
                    (identity.city_id,)
                )
                 columns = [desc[0] for desc in cur.description]
                 rows = cur.fetchall()
                 for row in rows:
                    item = {}
                    for col, val in zip(columns, row):
                        item[col] = val
                    cities.append(item)
            elif identity.role == "super_admin":
                 cur.execute(
                    "SELECT id, name FROM city ORDER BY name",
                )
                 columns = [desc[0] for desc in cur.description]
                 rows = cur.fetchall()
                 for row in rows:
                    item = {}
                    for col, val in zip(columns, row):
                        item[col] = val
                    cities.append(item)
                    
    return cities
