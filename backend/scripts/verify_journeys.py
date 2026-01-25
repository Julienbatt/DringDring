import os
import sys
import requests
import json
import datetime
from jose import jwt
import psycopg

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

API_URL = "http://localhost:8000/api/v1"

def get_profile(email):
    try:
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=None)
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
                print(f"FAIL: Profile not found for {email}")
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
    except Exception as e:
        print(f"FAIL: DB error for {email}: {e}")
        return None

def forge_token(profile):
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

def test_endpoint(name, method, path, token, expected_status=200, payload=None):
    url = f"{API_URL}{path}"
    
    headers = {"Authorization": f"Bearer {token}"}
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=payload)
        else:
            print(f"FAIL: Unsupported method {method}")
            return False, None

        if response.status_code == expected_status:
            print(f"OK: {name}: {method} {path} -> {response.status_code}")
            return True, response.json() if response.content else None

        print(f"FAIL: {name}: {method} {path} -> {response.status_code} (Expected {expected_status})")
        if response.text:
            print(f"   Response: {response.text}")
        return False, None
    except Exception as e:
        print(f"FAIL: {name} error: {e}")
        return False, None

def main():
    print("Starting user journey verification...")
    month = datetime.date.today().strftime("%Y-%m")
    
    # 1. Courier
    print("\nVerifying COURIER journey...")
    courier_email = "coursier@dringdring.ch"
    courier_profile = get_profile(courier_email)
    if not courier_profile:
        return
    courier_token = forge_token(courier_profile)
    
    success, deliveries = test_endpoint("Courier Deliveries", "GET", "/deliveries/courier", courier_token)
    if success and deliveries:
        # Try to update status if any delivery exists
        if len(deliveries) > 0:
            delivery_id = deliveries[0]['delivery_id']
            test_endpoint("Update Status Picked Up", "POST", f"/deliveries/{delivery_id}/status?status=picked_up", courier_token)
    
    # 2. Customer
    print("\nVerifying CUSTOMER journey...")
    customer_email = "client@dringdring.ch"
    customer_profile = get_profile(customer_email)
    if not customer_profile:
        return
    customer_token = forge_token(customer_profile)
    test_endpoint("Customer Timeline", "GET", "/deliveries/customer", customer_token)

    # 3. Shop
    print("\nVerifying SHOP journey...")
    shop_email = "shop_metropole@dringdring.ch"
    shop_profile = get_profile(shop_email)
    if not shop_profile:
        return
    shop_token = forge_token(shop_profile)
    test_endpoint("Shop History", "GET", f"/deliveries/shop?month={month}", shop_token)
    test_endpoint("Shop Config", "GET", "/deliveries/shop/configuration", shop_token)

    # 4. City
    print("\nVerifying CITY journey...")
    city_email = "sion@dringdring.ch"
    city_profile = get_profile(city_email)
    if not city_profile:
        return
    city_token = forge_token(city_profile)
    test_endpoint("City Billing", "GET", f"/reports/city-billing?month={month}", city_token)

    # 5. HQ
    print("\nVerifying HQ journey...")
    hq_email = "migros@dringdring.ch"
    hq_profile = get_profile(hq_email)
    if not hq_profile:
        return
    hq_token = forge_token(hq_profile)
    test_endpoint("HQ Billing", "GET", f"/reports/hq-billing?month={month}", hq_token)

    # 6. Admin
    print("\nVerifying ADMIN journey...")
    admin_email = "admin_vs@dringdring.ch"
    admin_profile = get_profile(admin_email)
    if not admin_profile:
        return
    admin_token = forge_token(admin_profile)
    test_endpoint("Admin Shops List", "GET", "/shops/admin", admin_token)

    print("\nVerification complete.")

if __name__ == "__main__":
    main()
