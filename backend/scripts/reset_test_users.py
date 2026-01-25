import os
import sys
import json
import urllib.request
import urllib.error

import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings


def admin_request(method, path, payload=None):
    url = f"{settings.SUPABASE_URL}{path}"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else None


def fetch_id(cur, table, label, pattern):
    cur.execute(
        f"SELECT id, name FROM {table} WHERE name ILIKE %s ORDER BY name LIMIT 1",
        (pattern,),
    )
    row = cur.fetchone()
    if not row:
        raise RuntimeError(f"Missing {label} for pattern {pattern}")
    print(f"{label}: {row[1]}")
    return row[0]


def main():
    password = os.getenv("TEST_USER_PASSWORD")
    if len(sys.argv) > 1:
        password = sys.argv[1]

    if not password:
        print("Missing TEST_USER_PASSWORD (or pass password as first argument).")
        sys.exit(1)

    if not settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_SERVICE_KEY == "placeholder_until_recovered":
        print("Missing SUPABASE_SERVICE_KEY in backend/.env.")
        sys.exit(1)

    domains_env = os.getenv("TEST_USER_DOMAINS", "@dringdring.ch,@ik.me")
    domains = [d.strip() for d in domains_env.split(",") if d.strip()]
    patterns = []
    for domain in domains:
        if domain.startswith("@"):
            patterns.append(f"%{domain}")
        else:
            patterns.append(f"%@{domain}")

    with psycopg.connect(settings.DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            admin_region_id = fetch_id(cur, "public.admin_region", "Admin Region (Valais)", "%Valais%")
            city_sion_id = fetch_id(cur, "public.city", "City (Sion)", "%Sion%")
            hq_migros_id = fetch_id(cur, "public.hq", "HQ (Migros)", "%Migros%")
            hq_independents_id = fetch_id(cur, "public.hq", "HQ (Independants)", "%Indep%")
            shop_metropole_id = fetch_id(cur, "public.shop", "Shop (Metropole)", "%Metropole%")
            shop_mario_id = fetch_id(cur, "public.shop", "Shop (Mario)", "%Mario%")
            client_bob_id = fetch_id(cur, "public.client", "Client (Bob)", "%Bob%")

            where_clause = " OR ".join(["email ILIKE %s"] * len(patterns))
            cur.execute(f"SELECT id, email FROM auth.users WHERE {where_clause}", patterns)
            existing = cur.fetchall()
            if existing:
                print("Deleting existing test users...")
                for user_id, email in existing:
                    try:
                        admin_request("DELETE", f"/auth/v1/admin/users/{user_id}")
                        print(f"- deleted {email}")
                    except urllib.error.HTTPError as exc:
                        print(f"- failed to delete {email}: {exc.read().decode('utf-8')}")

                user_ids = [row[0] for row in existing]
                cur.execute("DELETE FROM public.courier WHERE user_id = ANY(%s)", (user_ids,))
                cur.execute("DELETE FROM public.profiles WHERE id = ANY(%s)", (user_ids,))
            else:
                print("No test users found to delete.")

            users = [
                ("superadmin@dringdring.ch", {"role": "super_admin"}),
                ("admin_vs@dringdring.ch", {"role": "admin_region", "admin_region_id": str(admin_region_id)}),
                ("sion@dringdring.ch", {"role": "city", "city_id": str(city_sion_id)}),
                ("migros@dringdring.ch", {"role": "hq", "hq_id": str(hq_migros_id)}),
                ("shop_metropole@dringdring.ch", {"role": "shop", "shop_id": str(shop_metropole_id), "hq_id": str(hq_migros_id)}),
                ("shop_mario@dringdring.ch", {"role": "shop", "shop_id": str(shop_mario_id), "hq_id": str(hq_independents_id)}),
                ("coursier@dringdring.ch", {"role": "courier", "admin_region_id": str(admin_region_id)}),
                ("client@dringdring.ch", {"role": "customer", "client_id": str(client_bob_id)}),
            ]

            created_ids = {}
            print("Creating test users...")
            for email, app_metadata in users:
                payload = {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "app_metadata": app_metadata,
                    "user_metadata": {},
                }
                try:
                    response = admin_request("POST", "/auth/v1/admin/users", payload)
                    created_ids[email] = response.get("id")
                    print(f"- created {email}")
                except urllib.error.HTTPError as exc:
                    print(f"- failed to create {email}: {exc.read().decode('utf-8')}")

            courier_id = created_ids.get("coursier@dringdring.ch")
            if courier_id:
                cur.execute(
                    """
                    INSERT INTO courier (
                        id, user_id, first_name, last_name, courier_number, phone_number,
                        email, active, admin_region_id
                    ) VALUES (
                        gen_random_uuid(), %s, 'Alex', 'Courier', 'C-100', '+41 79 000 0000',
                        %s, true, %s
                    )
                    ON CONFLICT (courier_number) DO UPDATE
                    SET user_id = EXCLUDED.user_id,
                        email = EXCLUDED.email,
                        admin_region_id = EXCLUDED.admin_region_id,
                        active = true
                    """,
                    (courier_id, "coursier@dringdring.ch", admin_region_id),
                )

    print("Done. Users must log out/login to refresh JWT claims.")


if __name__ == "__main__":
    main()
