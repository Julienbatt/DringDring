import os
import sys
import base64
import requests
import json
import uuid
import datetime
from jose import jwt

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings
import psycopg

API_URL = "http://localhost:8000/api/v1"

def get_user_id(email):
    # Use direct connection as in seed.py
    try:
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM auth.users WHERE email = %s", (email,))
            row = cur.fetchone()
            return row[0] if row else None
    except Exception as e:
        print(f"DB Error: {e}")
        return None

def forge_tokens(user_id, email):
    secret = settings.SUPABASE_JWT_SECRET
    
    tokens = []
    
    # Payload
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": "authenticated",
        "app_metadata": {"provider": "email", "providers": ["email"]},
        "user_metadata": {},
        "aud": "authenticated",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        "iat": datetime.datetime.utcnow(),
    }

    # 1. RAW
    try:
        t = jwt.encode(payload, secret, algorithm="HS256")
        tokens.append(("RAW", t))
    except Exception as e:
        print(f"Error signing RAW: {e}")

    # 2. DECODED (Fix padding)
    try:
        padded_secret = secret + "=" * ((4 - len(secret) % 4) % 4)
        dec_secret = base64.b64decode(padded_secret)
        t = jwt.encode(payload, dec_secret, algorithm="HS256")
        tokens.append(("DECODED", t))
    except Exception as e:
        print(f"Error signing DECODED: {e}")

    return tokens

def test_endpoint(name, method, path, tokens, expected_status=200, payload=None):
    url = f"{API_URL}{path}"
    
    for token_type, token in tokens:
        headers = {"Authorization": f"Bearer {token}"}
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code == expected_status:
                print(f"✅ {name} ({token_type}): {method} {path} -> {response.status_code}")
                return True, response.json() if response.content else None
            # If 401, keep trying next token
            if response.status_code != 401:
                 # If it's not 401, it's a failure (e.g. 404, 500), so report it but return False
                print(f"❌ {name} ({token_type}): {method} {path} -> {response.status_code} (Expected {expected_status})")
        except Exception as e:
            pass

    print(f"❌ {name}: Failed with all token variations (last status: {response.status_code if 'response' in locals() else 'N/A'})")
    if 'response' in locals():
        print(f"   Response: {response.text}")
    return False, None

def main():
    print("🚀 Starting User Journey Verification...")
    
    # 1. Courier
    print("\n🚴 Verifying COURIER Journey...")
    courier_email = "coursier@dringdring.ch"
    courier_id = get_user_id(courier_email)
    if not courier_id:
        print("❌ Courier user not found in DB")
        return
    courier_tokens = forge_tokens(courier_id, courier_email)
    
    success, deliveries = test_endpoint("Courier Deliveries", "GET", "/deliveries/courier", courier_tokens)
    if success and deliveries:
        # Try to update status if any delivery exists
        if len(deliveries) > 0:
            delivery_id = deliveries[0]['delivery_id']
            test_endpoint("Update Status Picked Up", "POST", f"/deliveries/{delivery_id}/status?status=picked_up", courier_tokens)
    
    # 2. Customer
    print("\n👤 Verifying CUSTOMER Journey...")
    customer_email = "client@dringdring.ch"
    customer_id = get_user_id(customer_email)
    customer_tokens = forge_tokens(customer_id, customer_email)
    test_endpoint("Customer Timeline", "GET", "/deliveries/customer", customer_tokens)

    # 3. Shop
    print("\n🏪 Verifying SHOP Journey...")
    shop_email = "shop_metropole@dringdring.ch"
    shop_id = get_user_id(shop_email)
    shop_tokens = forge_tokens(shop_id, shop_email)
    test_endpoint("Shop History", "GET", "/deliveries/shop?month=2025-01", shop_tokens)
    test_endpoint("Shop Config", "GET", "/deliveries/shop/configuration", shop_tokens)

    # 4. City
    print("\n🏢 Verifying CITY Journey...")
    city_email = "sion@dringdring.ch"
    city_id = get_user_id(city_email)
    city_tokens = forge_tokens(city_id, city_email)
    test_endpoint("City Billing", "GET", "/reports/city-billing?month=2025-01", city_tokens)

    # 5. HQ
    print("\n🏭 Verifying HQ Journey...")
    hq_email = "migros@dringdring.ch"
    hq_id = get_user_id(hq_email)
    hq_tokens = forge_tokens(hq_id, hq_email)
    test_endpoint("HQ Billing", "GET", "/reports/hq-billing?month=2025-01", hq_tokens)

    # 6. Admin
    print("\n🏛️ Verifying ADMIN Journey...")
    admin_email = "admin_vs@dringdring.ch"
    admin_id = get_user_id(admin_email)
    admin_tokens = forge_tokens(admin_id, admin_email)
    # Admin routes are a bit different, checking shops list
    test_endpoint("Admin Shops List", "GET", "/shops/admin", admin_tokens)

    print("\n✨ Verification Complete.")

if __name__ == "__main__":
    main()
