
import sys
import os
import io
import uuid
import datetime
import decimal
import asyncio
from unittest.mock import patch, MagicMock

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from httpx import AsyncClient, ASGITransport
import psycopg

from app.main import app
from app.core.config import settings
from app.core.security import get_current_user_claims

# Setup DB connection
try:
    conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
except Exception as e:
    print(f"Failed to connect to DB: {e}")
    sys.exit(1)

def get_user_id(email):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM auth.users WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row:
            print(f"User not found: {email}. Did you run seed.py?")
            sys.exit(1)
        return str(row[0])

def get_client_id(city="Sion"):
    with conn.cursor() as cur:
        # Find a client in Sion (active shop city)
        cur.execute("SELECT id FROM client WHERE city_name = %s LIMIT 1", (city,))
        row = cur.fetchone()
        if not row:
             # Fallback to any client
            cur.execute("SELECT id FROM client LIMIT 1")
            row = cur.fetchone()
        return str(row[0])

print("Fetching Test Data...")
SHOP_EMAIL = "shop_metropole@dringdring.ch"
HQ_EMAIL = "migros@dringdring.ch"

SHOP_USER_ID = get_user_id(SHOP_EMAIL)
HQ_USER_ID = get_user_id(HQ_EMAIL)
CLIENT_ID = get_client_id("Sion")

print(f"Users found. Shop: {SHOP_USER_ID}, HQ: {HQ_USER_ID}")

# Determine current month for testing
today = datetime.date.today()
current_month_str = today.strftime("%Y-%m")
# Choose a date in the current month
delivery_date = today.strftime("%Y-%m-%d")

# Clean up existing billing_period for this shop/month to ensure test repeatability
with conn.cursor() as cur:
    # Get shop id for the user
    cur.execute("SELECT shop_id FROM profiles WHERE id = %s", (SHOP_USER_ID,))
    shop_id = cur.fetchone()[0]
    
    # Delete billing period if exists
    cur.execute("DELETE FROM billing_period WHERE shop_id = %s AND period_month = %s", (shop_id, f"{current_month_str}-01"))
    
    # FIX DB DATA: Ensure tariff share has admin_region (missing in seed)
    # 33.33 + 33.33 + 33.34 = 100. Add admin_region: 0
    cur.execute(
        """
        UPDATE tariff_version 
        SET share = '{"client": 33.33, "shop": 33.33, "city": 33.34, "admin_region": 0.0}'::jsonb
        WHERE id = (SELECT tariff_version_id FROM shop WHERE id = %s)
        """,
        (shop_id,)
    )

    pass

# Mock Supabase Storage Upload
patcher_upload = patch("app.routes.deliveries.upload_pdf_bytes")
mock_upload = patcher_upload.start()
mock_upload.return_value = f"shop/{shop_id}/{current_month_str}.pdf"

# Mock JWT Decode
patcher_jwt = patch("app.core.security.jwt.decode")
mock_jwt_decode = patcher_jwt.start()

# We don't use dependency_overrides anymore, we Mock the JWT decode logic
transport = ASGITransport(app=app)

async def run_test():
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("\nStarting E2E Billing Verification (Async + JWT Mock)")
        
        # 1. Shop creates a delivery
        print(f"\nStep 1: Login as Shop ({SHOP_EMAIL}) and create delivery")
        
        # Configure Mock for Shop User
        mock_jwt_decode.return_value = {
            "sub": SHOP_USER_ID,
            "email": SHOP_EMAIL,
            "role": "authenticated",
            "app_metadata": {"role": "shop", "shop_id": str(shop_id)},
            "user_metadata": {}
        }
        
        payload = {
            "client_id": CLIENT_ID,
            "delivery_date": delivery_date,
            "time_window": "08:00-12:00",
            "bags": 5,
            "order_amount": None 
        }
        
        # Must send Authorization header for HTTPBearer to pass
        headers = {"Authorization": "Bearer mock_token"}
        
        res = await client.post("/api/v1/deliveries/shop", json=payload, headers=headers)
        if res.status_code != 201:
            print(f"Failed to create delivery: {res.text}")
            return False
        print("Delivery created successfully")

        # 2. HQ Views Billing
        print(f"\nStep 2: Login as HQ ({HQ_EMAIL}) and review billing")
        
        # Configure Mock for HQ User
        # We need to find the HQ ID for this user to be correct? 
        # Actually security.py extracts hq_id from metadata or profile triggers (Supabase usually handles this)
        # But get_current_user implementation fetches from token payload.
        # Let's see get_current_user in security.py. It reads app_metadata/user_metadata.
        # So I should inject the correct role and ID in the mock payload.
        
        # We need the HQ ID.
        with conn.cursor() as cur:
             cur.execute("SELECT hq_id FROM profiles WHERE id = %s", (HQ_USER_ID,))
             hq_id = str(cur.fetchone()[0])

        mock_jwt_decode.return_value = {
            "sub": HQ_USER_ID,
            "email": HQ_EMAIL,
            "role": "authenticated",
            "app_metadata": {"role": "hq", "hq_id": hq_id},
            "user_metadata": {}
        }
        
        res = await client.get(f"/api/v1/reports/hq-billing?month={current_month_str}", headers=headers)
        if res.status_code != 200:
            print(f"Failed to fetch HQ billing: {res.text}")
            return False
        
        data = res.json()
        shop_row = next((r for r in data["rows"] if r["shop_id"] == str(shop_id)), None)
        if not shop_row:
            print("Shop not found in HQ billing report")
            return False
        
        print(f"   Found Shop: {shop_row['shop_name']}")
        print(f"   Deliveries: {shop_row['total_deliveries']}")
        print(f"   Status: {'Frozen' if shop_row['is_frozen'] else 'Open'}")
        
        # 3. HQ Freezes Period
        print(f"\nStep 3: HQ freezes the period")
        res = await client.post(
            f"/api/v1/deliveries/shop/freeze?shop_id={shop_id}&month={current_month_str}&frozen_comment=AutoTest",
            headers=headers
        )
        
        if res.status_code != 200:
            print(f"Failed to freeze period: {res.text}")
            return False
        
        json_res = res.json()
        print(f"Period Frozen. PDF Path: {json_res.get('pdf_path')}")

        # 4. Storage Upload Verification
        if mock_upload.called:
            print("Backend attempted to upload PDF to Storage (Mocked)")
        else:
            print("Upload was not called!")
            return False

        # 5. Shop tries to create delivery in frozen period
        print(f"\nStep 4: Shop tries to modify frozen period")
        
        # Switch back to Shop User
        mock_jwt_decode.return_value = {
            "sub": SHOP_USER_ID,
            "email": SHOP_EMAIL,
            "role": "authenticated",
            "app_metadata": {"role": "shop", "shop_id": str(shop_id)},
            "user_metadata": {}
        }

        res = await client.post("/api/v1/deliveries/shop", json=payload, headers=headers)
        if res.status_code == 409:
            print("System successfully BLOCKED creation (409 Conflict)")
        else:
            print(f"Unexpected status code: {res.status_code}. Should be 409.")
            return False

        print("\nALL CHECKS PASSED!")
        return True

if __name__ == "__main__":
    try:
        success = asyncio.run(run_test())
        if not success:
            sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        patcher_upload.stop()
        patcher_jwt.stop()
        conn.close()
