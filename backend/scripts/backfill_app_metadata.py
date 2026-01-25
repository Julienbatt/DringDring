import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings


def main() -> None:
    conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE auth.users u
                SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
                    || jsonb_strip_nulls(
                        jsonb_build_object(
                            'role', p.role,
                            'admin_region_id', p.admin_region_id::text,
                            'shop_id', p.shop_id::text,
                            'city_id', p.city_id::text,
                            'hq_id', p.hq_id::text,
                            'client_id', p.client_id::text
                        )
                    )
                FROM public.profiles p
                WHERE p.id = u.id
                """
            )
            updated = cur.rowcount
    finally:
        conn.close()

    print(f"Backfill complete. Rows updated: {updated}")
    print("Users must refresh tokens (logout/login) to receive new JWT claims.")


if __name__ == "__main__":
    main()
