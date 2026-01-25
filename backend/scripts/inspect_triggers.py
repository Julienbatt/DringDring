import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def main():
    try:
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
        with conn.cursor() as cur:
            print("--- Users in auth.users ---")
            try:
                cur.execute("SELECT id, email, role FROM auth.users")
                users = cur.fetchall()
                for u in users:
                    print(f"User: {u[1]} ({u[2]}) - {u[0]}")
            except Exception as e:
                print(f"Error listing users: {e}")

            print("\n--- Triggers on auth.users ---")
            try:
                cur.execute("""
                    SELECT event_object_schema as table_schema,
                           event_object_table as table_name,
                           trigger_schema,
                           trigger_name,
                           action_orientation,
                           action_timing
                    FROM information_schema.triggers
                    WHERE event_object_table = 'users'
                    AND event_object_schema = 'auth'
                """)
                triggers = cur.fetchall()
                if triggers:
                    for t in triggers:
                        print(f"Trigger: {t[3]} ({t[5]} {t[4]})")
                else:
                    print("No triggers found on auth.users")
            except Exception as e:
                print(f"Error listing triggers: {e}")
                
            print("\n--- Checking default search_path ---")
            cur.execute("SHOW search_path")
            print(f"search_path: {cur.fetchone()[0]}")

    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    main()
