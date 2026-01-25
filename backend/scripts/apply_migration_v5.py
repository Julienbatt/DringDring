import os
import sys
# Add backend to sys.path to allow importing app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend/.env'))

import psycopg2
from app.core.config import settings

def apply_migration():
    print(f"Connecting to DB...")
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    # Use absolute path or relative to CWD which is project root
    migration_file = os.path.join(os.getcwd(), "backend/migrations/update_client_v5.sql")
    
    with open(migration_file, "r") as f:
        sql = f.read()
        print("Executing SQL:")
        print(sql)
        cur.execute(sql)
        conn.commit()
    
    print("Migration applied successfully.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    apply_migration()
