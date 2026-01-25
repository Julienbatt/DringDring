import os
import sys
import psycopg

# Add backend directory to path to import config
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def main():
    print("Connecting...")
    try:
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
        print("Connected.")
        with conn.cursor() as cur:
            print("Querying triggers...")
            cur.execute("""
                SELECT trigger_name, event_manipulation, event_object_table, action_statement
                FROM information_schema.triggers
                WHERE event_object_schema = 'auth' AND event_object_table = 'users'
            """)
            rows = cur.fetchall()
            if not rows:
                print("No triggers on auth.users")
            for r in rows:
                print(f"Trigger: {r[0]} ({r[1]} on {r[2]}) -> {r[3]}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
