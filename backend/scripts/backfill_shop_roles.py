import os
import sys

import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings  # noqa: E402


def main() -> None:
    conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH shop_users AS (
                  SELECT u.id,
                         s.id AS shop_id,
                         s.city_id,
                         c.admin_region_id,
                         s.hq_id
                  FROM auth.users u
                  JOIN public.shop s ON lower(s.email) = lower(u.email)
                  JOIN public.city c ON c.id = s.city_id
                )
                UPDATE auth.users u
                SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
                  || jsonb_strip_nulls(
                       jsonb_build_object(
                         'role', 'shop',
                         'shop_id', su.shop_id::text,
                         'city_id', su.city_id::text,
                         'admin_region_id', su.admin_region_id::text,
                         'hq_id', su.hq_id::text
                       )
                     )
                FROM shop_users su
                WHERE u.id = su.id
                """
            )
            users_updated = cur.rowcount

            cur.execute(
                """
                WITH shop_users AS (
                  SELECT u.id,
                         s.id AS shop_id,
                         s.city_id,
                         c.admin_region_id,
                         s.hq_id
                  FROM auth.users u
                  JOIN public.shop s ON lower(s.email) = lower(u.email)
                  JOIN public.city c ON c.id = s.city_id
                )
                INSERT INTO public.profiles (id, role, admin_region_id, city_id, hq_id, shop_id)
                SELECT su.id,
                       'shop',
                       su.admin_region_id,
                       su.city_id,
                       su.hq_id,
                       su.shop_id
                FROM shop_users su
                LEFT JOIN public.profiles p ON p.id = su.id
                WHERE p.id IS NULL
                """
            )
            profiles_created = cur.rowcount

            cur.execute(
                """
                WITH shop_users AS (
                  SELECT u.id,
                         s.id AS shop_id,
                         s.city_id,
                         c.admin_region_id,
                         s.hq_id
                  FROM auth.users u
                  JOIN public.shop s ON lower(s.email) = lower(u.email)
                  JOIN public.city c ON c.id = s.city_id
                )
                UPDATE public.profiles p
                SET role = 'shop',
                    admin_region_id = su.admin_region_id,
                    city_id = su.city_id,
                    hq_id = su.hq_id,
                    shop_id = su.shop_id
                FROM shop_users su
                WHERE p.id = su.id
                  AND (p.role IS NULL OR p.role = 'customer')
                """
            )
            profiles_updated = cur.rowcount
    finally:
        conn.close()

    print(f"Auth users updated: {users_updated}")
    print(f"Profiles created: {profiles_created}")
    print(f"Profiles updated: {profiles_updated}")
    print("Users must refresh tokens (logout/login) to receive new JWT claims.")


if __name__ == "__main__":
    main()
