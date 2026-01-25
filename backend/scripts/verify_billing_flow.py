
import sys
import os
import asyncio
import datetime
import decimal
from unittest.mock import patch

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from httpx import AsyncClient, ASGITransport
import psycopg

from app.main import app
from app.core.config import settings

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
delivery_date = today.strftime("%Y-%m-%d")

# Clean up existing billing_period for this shop/month to ensure test repeatability
with conn.cursor() as cur:
    cur.execute("SELECT shop_id FROM profiles WHERE id = %s", (SHOP_USER_ID,))
    shop_id = cur.fetchone()[0]
    
    # Delete billing period if exists
    cur.execute("DELETE FROM billing_period WHERE shop_id = %s AND period_month = %s", (shop_id, f"{current_month_str}-01"))
    
    # FIX DB DATA: Ensure tariff share has admin_region (if missing)
    # The seed might have been updated, but let's ensure it's correct for the test
    cur.execute(
        """
        UPDATE tariff_version 
        SET share = '{"client": 33.33, "shop": 33.33, "city": 33.34, "admin_region": 0.0}'::jsonb
        WHERE id = (SELECT tariff_version_id FROM shop WHERE id = %s)
        """,
        (shop_id,)
    )

# Mock Supabase Storage Upload
patcher_upload = patch("app.core.billing_processing.upload_pdf_bytes")
mock_upload = patcher_upload.start()
mock_upload.return_value = f"shop/{shop_id}/{current_month_str}.pdf"

# Mock JWT Decode
patcher_jwt = patch("app.core.security.jwt.decode")
mock_jwt_decode = patcher_jwt.start()

transport = ASGITransport(app=app)

async def run_test():
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("\nStarting E2E Billing Verification (Async + JWT Mock)")
        
        # 1. Shop creates a delivery
        print(f"\nStep 1: Login as Shop ({SHOP_EMAIL}) and create delivery")
        
        mock_jwt_decode.return_value = {
            "sub": SHOP_USER_ID,
            "email": SHOP_EMAIL,
            "role": "authenticated",
            "app_metadata": {"role": "shop", "shop_id": str(shop_id)},
            "user_metadata": {}
        }
        
        # 2 bags -> Should be 15 CHF total (based on seed data)
        payload = {
            "client_id": CLIENT_ID,
            "delivery_date": delivery_date,
            "time_window": "08:00-12:00",
            "bags": 2, 
            "order_amount": None 
        }
        
        headers = {"Authorization": "Bearer mock_token"}
        
        res = await client.post("/api/v1/deliveries/shop", json=payload, headers=headers)
        if res.status_code != 201:
            print(f"Failed to create delivery: {res.text}")
            return False
        
        delivery_id = res.json()["delivery_id"]
        print(f"Delivery created successfully. ID: {delivery_id}")

        # 1.1 Verify Financial Snapshot in DB
        print(f"\nStep 1.1: Verify Financial Snapshot in DB")
        with conn.cursor() as cur:
            cur.execute("""
                SELECT share_client, share_shop, share_city, total_price 
                FROM delivery_financial 
                WHERE delivery_id = %s
            """, (delivery_id,))
            row = cur.fetchone()
            
            if not row:
                print("Error: No financial snapshot found!")
                return False
                
            client_price, shop_price, col_price, total_price = row
            # Expecting 15 CHF Total. 
            # Share: Client 33.33% (5.00), Shop 33.33% (5.00), City 33.34% (5.00)
            
            print(f"   Snapshot Prices: Total={total_price}, Client={client_price}, Shop={shop_price}, City={col_price}")
            
            if float(total_price) != 15.0:
                print(f"   ERROR: Expected Total 15.0, got {total_price}")
                return False
            
            if float(client_price) != 5.0 or float(shop_price) != 5.0 or float(col_price) != 5.0:
                print(f"   ERROR: Expected 5.0/5.0/5.0 distribution.")
                return False
                
            print("   [OK] Financial Snapshot is correct.")

        # 1.2 Move to DELIVERED
        # 1.2 Move to VALIDATED
        print(f"\nStep 1.2: Move delivery to VALIDATED")
        # Assuming we have an endpoint or we just update via API. 
        # The shop usually can't 'deliver' it, the courier does. 
        # But for simplicity let's assume the shop cancels or we use a courier user?
        # A simple status update via DB for this test script might be easier if we don't want to mock a courier login.
        # But let's try to stick to API. 
        # Let's see if there is a 'complete' endpoint.
        # Looking at routes/deliveries.py might help. 
        # Actually, let's just update the status in DB to simulate "work done".
        with conn.cursor() as cur:
            cur.execute("UPDATE delivery_status SET status = 'validated' WHERE delivery_id = %s", (delivery_id,))
        print("   [OK] Delivery status updated to VALIDATED (via DB injection)")

        # 2. HQ Views Billing
        print(f"\nStep 2: Login as HQ ({HQ_EMAIL}) and review billing")
        
        with conn.cursor() as cur:
             cur.execute("SELECT hq_id FROM profiles WHERE id = %s", (HQ_USER_ID,))
             hq_row = cur.fetchone()
             hq_id = str(hq_row[0]) if hq_row else None

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
        print(f"   Period Frozen. PDF Path: {json_res.get('pdf_path')}")
        
        # Check PDF generation was requested
        if not mock_upload.called:
             print("   ERROR: upload_pdf_bytes was NOT called")
             return False
        print("   [OK] PDF Upload called correctly")

        # 5. Shop tries to create delivery in frozen period
        print(f"\nStep 4: Shop tries to modify frozen period")
        
        mock_jwt_decode.return_value = {
            "sub": SHOP_USER_ID,
            "email": SHOP_EMAIL,
            "role": "authenticated",
            "app_metadata": {"role": "shop", "shop_id": str(shop_id)},
            "user_metadata": {}
        }

        res = await client.post("/api/v1/deliveries/shop", json=payload, headers=headers)
        if res.status_code == 409:
            print("   [OK] System successfully BLOCKED creation (409 Conflict)")
        else:
            print(f"   ERROR: Unexpected status code: {res.status_code}. Should be 409.")
            return False

        print("\nALL VERIFICATION CHECKS PASSED!")
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
