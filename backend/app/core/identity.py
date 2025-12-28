from app.db.session import get_db_connection
from app.schemas.me import MeResponse


def resolve_identity(user_id: str, email: str, jwt_claims: str) -> MeResponse:
    """
    Central identity source of truth for DringDring.
    """
    with get_db_connection(jwt_claims) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT role, city_id, hq_id, shop_id, admin_region_id
                FROM public.profiles
                WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()

    if not row:
        return MeResponse(
            user_id=user_id,
            email=email,
            role="guest",
            city_id=None,
            hq_id=None,
            admin_region_id=None,
        )

    role, city_id, hq_id, shop_id, admin_region_id = row

    return MeResponse(
        user_id=user_id,
        email=email,
        role=role,
        city_id=city_id,
        hq_id=hq_id,
        shop_id=shop_id,
        admin_region_id=admin_region_id,
    )
