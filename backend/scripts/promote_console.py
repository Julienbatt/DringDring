import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def promote_user(email):
    try:
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
        with conn.cursor() as cur:
            print(f"Checking {email}...")
            cur.execute("SELECT id FROM auth.users WHERE email = %s", (email,))
            row = cur.fetchone()
            if row:
                user_id = row[0]
                print(f"Found user {user_id}. Promoting...")
                cur.execute("""
                    INSERT INTO public.profiles (id, role) VALUES (%s, 'super_admin')
                    ON CONFLICT (id) DO UPDATE SET role = 'super_admin'
                """, (user_id,))
                print("User promoted to super_admin.")
            else:
                print(f"User {email} not found in auth.users")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        promote_user(sys.argv[1])
    else:
        promote_user("jub@ik.me")
