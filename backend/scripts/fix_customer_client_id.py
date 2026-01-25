import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings

EMAIL = "client@dringdring.ch"

with psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=None) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM auth.users WHERE email = %s", (EMAIL,))
        user_row = cur.fetchone()
        if not user_row:
            raise SystemExit(f"User not found: {EMAIL}")
        user_id = user_row[0]

        cur.execute("SELECT id, name FROM public.client ORDER BY name LIMIT 1")
        client_row = cur.fetchone()
        if not client_row:
            raise SystemExit("No clients found in public.client")
        client_id, client_name = client_row

        cur.execute(
            """
            UPDATE public.profiles
            SET role = 'customer', client_id = %s
            WHERE id = %s
            """,
            (client_id, user_id),
        )

        cur.execute(
            """
            UPDATE auth.users
            SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                || jsonb_strip_nulls(
                    jsonb_build_object('role', 'customer', 'client_id', %s::text)
                )
            WHERE id = %s
            """,
            (client_id, user_id),
        )

        print(f"Linked {EMAIL} -> {client_name} ({client_id})")
