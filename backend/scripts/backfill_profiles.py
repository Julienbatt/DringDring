import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings


SQL = """
INSERT INTO public.profiles (
    id,
    role,
    admin_region_id,
    city_id,
    hq_id,
    shop_id,
    client_id
)
SELECT
    u.id,
    COALESCE(u.raw_app_meta_data ->> 'role', 'customer') AS role,
    NULLIF(u.raw_app_meta_data ->> 'admin_region_id', '')::uuid,
    NULLIF(u.raw_app_meta_data ->> 'city_id', '')::uuid,
    NULLIF(u.raw_app_meta_data ->> 'hq_id', '')::uuid,
    NULLIF(u.raw_app_meta_data ->> 'shop_id', '')::uuid,
    NULLIF(u.raw_app_meta_data ->> 'client_id', '')::uuid
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role,
    admin_region_id = EXCLUDED.admin_region_id,
    city_id = EXCLUDED.city_id,
    hq_id = EXCLUDED.hq_id,
    shop_id = EXCLUDED.shop_id,
    client_id = EXCLUDED.client_id;
"""


def main():
    conn = psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=0)
    try:
        with conn.cursor() as cur:
            cur.execute(SQL)
            print("Profiles backfill complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
