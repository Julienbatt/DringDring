import os
import sys
import psycopg

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

SQL_TRIGGER = """
-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, admin_region_id, city_id, hq_id, shop_id, client_id)
  VALUES (
    new.id,
    COALESCE(new.raw_app_meta_data ->> 'role', 'customer'),
    NULLIF(new.raw_app_meta_data ->> 'admin_region_id', '')::uuid,
    NULLIF(new.raw_app_meta_data ->> 'city_id', '')::uuid,
    NULLIF(new.raw_app_meta_data ->> 'hq_id', '')::uuid,
    NULLIF(new.raw_app_meta_data ->> 'shop_id', '')::uuid,
    NULLIF(new.raw_app_meta_data ->> 'client_id', '')::uuid
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
"""

def main():
    print("Setting up auth trigger for default customer role...")
    try:
        conn = psycopg.connect(settings.DATABASE_URL, autocommit=True)
        with conn.cursor() as cur:
            cur.execute(SQL_TRIGGER)
            print("Trigger 'on_auth_user_created' created successfully.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
