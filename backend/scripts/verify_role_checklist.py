import datetime
import os
import sys
import psycopg
import requests
from jose import jwt

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from app.core.config import settings

API_URL = os.getenv("API_URL", "http://localhost:8010/api/v1")


def get_profile(email: str):
    conn = psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=None)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id, p.role, p.admin_region_id, p.city_id, p.hq_id, p.shop_id
                FROM auth.users u
                JOIN public.profiles p ON p.id = u.id
                WHERE u.email = %s
                """,
                (email,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "user_id": str(row[0]),
                "role": row[1],
                "admin_region_id": str(row[2]) if row[2] else None,
                "city_id": str(row[3]) if row[3] else None,
                "hq_id": str(row[4]) if row[4] else None,
                "shop_id": str(row[5]) if row[5] else None,
                "email": email,
            }
    finally:
        conn.close()


def token_for(profile: dict) -> str:
    app_metadata = {
        "role": profile["role"],
        "admin_region_id": profile["admin_region_id"],
        "city_id": profile["city_id"],
        "hq_id": profile["hq_id"],
        "shop_id": profile["shop_id"],
        "provider": "email",
        "providers": ["email"],
    }
    app_metadata = {k: v for k, v in app_metadata.items() if v is not None}

    payload = {
        "sub": profile["user_id"],
        "email": profile["email"],
        "role": "authenticated",
        "app_metadata": app_metadata,
        "aud": "authenticated",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


def call(method: str, path: str, token: str, payload: dict | None = None, timeout: int = 10):
    url = f"{API_URL}{path}"
    headers = {"Authorization": f"Bearer {token}"}
    if method == "GET":
        return requests.get(url, headers=headers, timeout=timeout)
    if method == "POST":
        return requests.post(url, headers=headers, json=payload, timeout=timeout)
    if method == "PATCH":
        return requests.patch(url, headers=headers, json=payload, timeout=timeout)
    raise ValueError("Unsupported method")


def ok(label: str, condition: bool, detail: str = ""):
    status = "OK" if condition else "FAIL"
    print(f"{status}: {label} {detail}".strip())


def main():
    month = datetime.date.today().strftime("%Y-%m")

    conn = psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=None)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM courier WHERE lower(email) = lower(%s) LIMIT 1",
                ("coursier@dringdring.ch",),
            )
            courier_row = cur.fetchone()
            if not courier_row:
                cur.execute("SELECT id FROM courier WHERE user_id IS NOT NULL LIMIT 1")
                courier_row = cur.fetchone()
            if not courier_row:
                raise SystemExit("No couriers found to run checklist.")
            courier_id = courier_row[0]
    finally:
        conn.close()

    def profile_token(email: str) -> str:
        profile = get_profile(email)
        if not profile:
            raise SystemExit(f"Profile missing for {email}")
        return token_for(profile)

    shop_profile = get_profile("shop_metropole@dringdring.ch")
    if not shop_profile:
        raise SystemExit("Profile missing for shop_metropole@dringdring.ch")

    shop_token = token_for(shop_profile)
    admin_token = profile_token("admin_vs@dringdring.ch")
    courier_token = profile_token("coursier@dringdring.ch")
    hq_token = profile_token("migros@dringdring.ch")
    city_token = profile_token("sion@dringdring.ch")
    super_token = profile_token("superadmin@dringdring.ch")
    customer_token = profile_token("client@dringdring.ch")

    # Get a client in the same city as the shop to avoid city mismatch
    conn = psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=None)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT city_id FROM shop WHERE id = %s", (shop_profile["shop_id"],))
            city_row = cur.fetchone()
            if not city_row:
                raise SystemExit("Shop city not found.")
            shop_city_id = city_row[0]
            cur.execute(
                "SELECT id FROM client WHERE city_id = %s ORDER BY name LIMIT 1",
                (shop_city_id,),
            )
            row = cur.fetchone()
            if not row:
                raise SystemExit("No clients found in the shop city.")
            client_id = row[0]
    finally:
        conn.close()

    # Ensure billing period is not frozen for this shop/month
    if shop_profile.get("shop_id"):
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=None)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM billing_period WHERE shop_id = %s AND period_month = %s",
                    (shop_profile["shop_id"], f"{month}-01"),
                )
        finally:
            conn.close()

    me_res = call("GET", "/me", shop_token)
    ok("Shop /me", me_res.status_code == 200, f"(status {me_res.status_code})")
    if me_res.status_code != 200:
        print(f"server: {me_res.headers.get('server')}")
        print(f"content-type: {me_res.headers.get('content-type')}")
        print(me_res.text)
        return

    payload = {
        "client_id": str(client_id),
        "delivery_date": datetime.date.today().isoformat(),
        "time_window": "08:00-12:00",
        "bags": 2,
        "order_amount": None,
        "notes": "Test auto",
    }
    res = call("POST", "/deliveries/shop", shop_token, payload)
    ok("Shop create delivery", res.status_code == 201, f"(status {res.status_code})")
    if res.status_code != 201:
        print(f"content-type: {res.headers.get('content-type')}")
        print(res.text)
        return

    delivery_id = res.json().get("delivery_id")

    res = call("GET", "/dispatch/deliveries", admin_token)
    ok("Admin dispatch list", res.status_code == 200, f"(status {res.status_code})")
    if res.status_code == 200:
        deliveries = res.json()
        ok("Delivery appears in dispatch", any(d["id"] == delivery_id for d in deliveries))
    else:
        print(res.text)

    res = call("PATCH", f"/dispatch/deliveries/{delivery_id}/assign", admin_token, {"courier_id": str(courier_id)})
    ok("Assign courier", res.status_code == 200, f"(status {res.status_code})")

    res = call("GET", "/deliveries/courier", courier_token)
    ok("Courier list", res.status_code == 200, f"(status {res.status_code})")
    if res.status_code == 200:
        ok("Courier sees assigned delivery", any(d["delivery_id"] == delivery_id for d in res.json()))
    else:
        print(res.text)

    res = call("POST", f"/deliveries/{delivery_id}/status?status=picked_up", courier_token)
    ok("Courier picked_up", res.status_code == 200, f"(status {res.status_code})")
    res = call("POST", f"/deliveries/{delivery_id}/status?status=delivered", courier_token)
    ok("Courier delivered", res.status_code == 200, f"(status {res.status_code})")
    if res.status_code != 200:
        print(res.text)

    res = call("GET", f"/reports/hq-billing?month={month}", hq_token)
    ok("HQ billing", res.status_code == 200, f"(status {res.status_code})")
    if res.status_code == 200:
        data = res.json()
        rows = data.get("rows", data.get("data", [])) if isinstance(data, dict) else data
        shop_names = {str(r.get("shop_name", "")).lower() for r in rows}
        ok("HQ excludes independents", "chez mario" not in shop_names)
        ok("HQ excludes Coop Vevey", "coop vevey" not in shop_names)
        ok("HQ includes Migros shops", any("migros" in name for name in shop_names))

    res = call("GET", f"/reports/city-billing?month={month}", city_token)
    ok("City billing", res.status_code == 200, f"(status {res.status_code})")
    if res.status_code == 200:
        data = res.json()
        rows = data.get("rows", data.get("data", [])) if isinstance(data, dict) else data
        cities = {str(r.get("city_name", "")).lower() for r in rows if r.get("city_name")}
        ok("City excludes Vevey", "vevey" not in cities)

    res = call("GET", "/regions", super_token)
    ok("Super admin list regions", res.status_code == 200, f"(status {res.status_code})")

    res = call("GET", "/deliveries/customer", customer_token)
    ok("Customer deliveries", res.status_code == 200, f"(status {res.status_code})")
    if res.status_code != 200:
        print(res.text)


if __name__ == "__main__":
    main()
