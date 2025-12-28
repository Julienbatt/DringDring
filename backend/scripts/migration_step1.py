import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def main():
    try:
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
        with conn.cursor() as cur:
            # 1. Check for bad data
            cur.execute("""
                SELECT count(*) FROM billing_period 
                WHERE pdf_url IS NULL OR pdf_sha256 IS NULL OR pdf_generated_at IS NULL
            """)
            bad_rows = cur.fetchone()[0]
            print(f"Rows with missing PDF data: {bad_rows}")
            
            if bad_rows > 0:
                print("Cleaning up invalid rows (dev environment)...")
                cur.execute("""
                    DELETE FROM billing_period 
                    WHERE pdf_url IS NULL OR pdf_sha256 IS NULL OR pdf_generated_at IS NULL
                """)
                print("Deleted invalid rows.")

            # 2. Apply Constraints
            print("Applying NOT NULL constraints...")
            alter_cmds = [
                "ALTER TABLE billing_period ALTER COLUMN pdf_url SET NOT NULL",
                "ALTER TABLE billing_period ALTER COLUMN pdf_sha256 SET NOT NULL",
                "ALTER TABLE billing_period ALTER COLUMN pdf_generated_at SET NOT NULL"
            ]
            
            for cmd in alter_cmds:
                try:
                    cur.execute(cmd)
                    print(f"Success: {cmd}")
                except Exception as e:
                    print(f"Failed: {cmd} -> {e}")
                    
        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
