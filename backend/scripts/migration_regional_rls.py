import logging
import os
import sys

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.db.session import get_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mock claims for migration (superuser)
MOCK_CLAIMS = '{"role": "service_role"}'

def run_migration():
    logger.info("Starting Regional RLS migration...")
    
    with get_db_connection(MOCK_CLAIMS) as conn:
        with conn.cursor() as cur:
            # 1. Enable RLS on tables where it might not be enabled
            tables = ["city", "shop", "delivery", "delivery_financial", "delivery_logistics"]
            for table in tables:
                cur.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
                # Policy for Super Admin / Service Role (bypass RLS)
                cur.execute(f"DROP POLICY IF EXISTS service_role_bypass ON {table};")
                cur.execute(f"""
                CREATE POLICY service_role_bypass ON {table}
                USING (
                    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
                    OR
                    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
                );
                """)

            # 2. Helper function to get admin_region_id safely
            cur.execute("""
            CREATE OR REPLACE FUNCTION get_my_admin_region_id() RETURNS uuid AS $$
            DECLARE
                claims jsonb;
                region_id text;
            BEGIN
                claims := current_setting('request.jwt.claims', true)::jsonb;
                
                -- Check app_metadata
                region_id := claims -> 'app_metadata' ->> 'admin_region_id';
                IF region_id IS NOT NULL THEN
                    RETURN region_id::uuid;
                END IF;
                
                -- Check user_metadata
                region_id := claims -> 'user_metadata' ->> 'admin_region_id';
                IF region_id IS NOT NULL THEN
                    RETURN region_id::uuid;
                END IF;
                
                RETURN NULL;
            EXCEPTION WHEN OTHERS THEN
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql STABLE;
            """)

            # 3. Policy for City
            # Admin Region: can see cities in their region
            cur.execute("DROP POLICY IF EXISTS admin_region_city_policy ON city;")
            cur.execute("""
            CREATE POLICY admin_region_city_policy ON city
            FOR SELECT
            USING (
                admin_region_id = get_my_admin_region_id()
                OR
                -- Allow public access or other roles if needed? 
                -- For now, restricts strictly to region if you are an admin_region user.
                -- Note: We need to handle 'shop' role or 'city' role too? 
                -- Assuming 'service_role_bypass' handles superusers.
                -- Let's add simple fallback: if no region claim, maybe deny (default RLS).
                -- But wait, standard users need to see their city?
                -- For this task, we focus on REGIONAL ADMIN isolation.
                
                -- If role is NOT admin_region, we should rely on other policies (or add them).
                -- To avoid breaking other roles, let's restrict this clause to when admin_region_id is present.
                (get_my_admin_region_id() IS NOT NULL)
            );
            """)

            # 4. Policy for Shop
            # Admin Region: see shops in cities of their region
            cur.execute("DROP POLICY IF EXISTS admin_region_shop_policy ON shop;")
            cur.execute("""
            CREATE POLICY admin_region_shop_policy ON shop
            FOR ALL
            USING (
                city_id IN (SELECT id FROM city WHERE admin_region_id = get_my_admin_region_id())
            );
            """)

            # 5. Policy for Delivery (and related tables)
            # Admin Region: see deliveries in shops of their region
            delivery_tables = ["delivery", "delivery_financial", "delivery_logistics"]
            for table in delivery_tables:
                cur.execute(f"DROP POLICY IF EXISTS admin_region_{table}_policy ON {table};")
                
                # Delivery has shop_id
                if table == "delivery":
                    cur.execute(f"""
                    CREATE POLICY admin_region_{table}_policy ON {table}
                    FOR SELECT
                    USING (
                        shop_id IN (
                            SELECT s.id FROM shop s 
                            JOIN city c ON c.id = s.city_id 
                            WHERE c.admin_region_id = get_my_admin_region_id()
                        )
                    );
                    """)
                else: 
                    # Financial/Logistics join via delivery_id key (which is FK to delivery.id)
                    # Ideally we filter by existence in delivery table which is already filtered?
                    # Or duplicate the join logic.
                    # RLS on child tables usually requires checking the parent relationship.
                    cur.execute(f"""
                    CREATE POLICY admin_region_{table}_policy ON {table}
                    FOR SELECT
                    USING (
                        delivery_id IN (
                            SELECT d.id FROM delivery d
                            JOIN shop s ON s.id = d.shop_id
                            JOIN city c ON c.id = s.city_id
                            WHERE c.admin_region_id = get_my_admin_region_id()
                        )
                    );
                    """)

            conn.commit()
            logger.info("Migration completed: Regional RLS policies enforced.")

if __name__ == "__main__":
    run_migration()
