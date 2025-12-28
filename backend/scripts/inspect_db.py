import os
import sys
import psycopg

# Add backend directory to path to import config
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def get_connection():
    # Simple parsing logic similar to session.py but simplified for script
    return psycopg.connect(settings.DATABASE_URL, autocommit=True)

def main():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                tables = ["delivery", "delivery_status", "delivery_logistics", "delivery_financial"]
                for table in tables:
                    print(f"--- Table: {table} ---")
                    cur.execute(f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position")
                    for row in cur.fetchall():
                        print(row)
                    print("\n")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
