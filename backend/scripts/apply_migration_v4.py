import os
import psycopg2
from app.core.config import settings

def apply_migration():
    print("Applying V4 Migration (Dispatch)...")
    
    # Read the SQL file
    migration_file = os.path.join(os.path.dirname(__file__), "../migrations/update_schema_dispatch_v4.sql")
    with open(migration_file, 'r') as f:
        sql = f.read()
        
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute(sql)
        conn.commit()
        
        print("Migration applied successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error applying migration: {e}")

if __name__ == "__main__":
    apply_migration()
