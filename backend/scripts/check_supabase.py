import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def main():
    try:
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
        with conn.cursor() as cur:
            print("Checking Database Views...")
            cur.execute("""
                SELECT table_name 
                FROM information_schema.views 
                WHERE table_schema = 'public'
            """)
            views = [row[0] for row in cur.fetchall()]
            required_views = ['view_city_billing', 'view_city_billing_shops', 'view_hq_billing_shops']
            
            for v in required_views:
                if v in views:
                    print(f"View found: {v}")
                else:
                    print(f"View MISSING: {v}")

            print("\nChecking Storage Buckets (if accessible)...")
            try:
                cur.execute("SELECT name, public FROM storage.buckets")
                buckets = cur.fetchall()
                found = False
                for b in buckets:
                    print(f"Bucket: {b[0]} (Public: {b[1]})")
                    if b[0] == 'billing-pdf':
                        found = True
                
                if not found:
                     print("Bucket 'billing-pdf' MISSING")
                else:
                     print("Bucket 'billing-pdf' FOUND")

            except Exception as e:
                print(f"Could not list buckets (Permission/Schema): {e}")
                print("   -> verification required via Supabase Dashboard")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
