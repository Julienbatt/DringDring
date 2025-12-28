import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def main():
    try:
        print("Connecting to database...")
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
        with conn.cursor() as cur:
            # 1. Add admin_region_id column to city table
            print("Adding admin_region_id to city table...")
            try:
                cur.execute("""
                    ALTER TABLE city 
                    ADD COLUMN IF NOT EXISTS admin_region_id UUID REFERENCES admin_region(id);
                """)
                print("Column added (or already exists).")
            except Exception as e:
                print(f"Error adding column: {e}")

            # 2. Add index for performance
            print("Adding index on admin_region_id...")
            try:
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_city_admin_region_id ON city(admin_region_id);
                """)
                print("Index created.")
            except Exception as e:
                print(f"Error creating index: {e}")

        conn.close()
        print("Migration successful.")

    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
