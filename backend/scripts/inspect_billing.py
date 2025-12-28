import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def get_connection():
    return psycopg.connect(settings.DATABASE_URL, autocommit=True)

def main():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                print("Inspecting 'billing_period' table...")
                cur.execute("SELECT * FROM billing_period LIMIT 0")
                for desc in cur.description:
                    print(f"Column: {desc.name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
