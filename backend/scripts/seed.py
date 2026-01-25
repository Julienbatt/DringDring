import os
import sys
import uuid
import psycopg
from datetime import date

import random
from decimal import Decimal
from datetime import timedelta

# Add backend directory to path to import config
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings
from app.core.tariff_engine import compute_financials

def get_connection():
    import re
    import socket
    
    # Simple parsing logic similar to session.py but simplified for script
    # Assuming valid connection string for dev
    return psycopg.connect(settings.DATABASE_URL, autocommit=True, prepare_threshold=None)

def cleanup_data(cur):
    print("Cleaning up old data...")
    tables = [
        "public.profiles",
        "public.delivery_financial",
        "public.delivery_logistics",
        "public.delivery_status",
        "public.delivery",
        "public.client",
        "public.shop",
        "public.tariff_grid",
        "public.tariff_version",
        "public.tariff",
        "public.hq",
        "public.admin_region",
        "public.city",
        "public.canton",
    ]
    for table in tables:
        cur.execute("SELECT to_regclass(%s)", (table,))
        if cur.fetchone()[0]:
            cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
    # Auth users are managed via reset_test_users.py to avoid direct writes to auth schema.

def seed_geo(cur):
    print("Seeding Geography...")
    
    # Cantons
    cantons = {
        "VS": str(uuid.uuid4()),
        "VD": str(uuid.uuid4())
    }
    cur.execute("INSERT INTO canton (id, name, code) VALUES (%s, 'Valais', 'VS')", (cantons["VS"],))
    cur.execute("INSERT INTO canton (id, name, code) VALUES (%s, 'Vaud', 'VD')", (cantons["VD"],))
    
    # Admin Regions (Create BEFORE Cities)
    admins = {
        "velocite_vs": str(uuid.uuid4()),
        "velocite_riviera": str(uuid.uuid4())
    }
    cur.execute("INSERT INTO admin_region (id, canton_id, name, active) VALUES (%s, %s, 'Velocite Valais', true)", (admins["velocite_vs"], cantons["VS"]))
    cur.execute("INSERT INTO admin_region (id, canton_id, name, active) VALUES (%s, %s, 'Velocite Riviera', true)", (admins["velocite_riviera"], cantons["VD"]))

    # Cities
    cities = {
        "sion": str(uuid.uuid4()),
        "vevey": str(uuid.uuid4())
    }
    # Sion -> Velocite Valais
    cur.execute(
        "INSERT INTO city (id, canton_id, admin_region_id, name) VALUES (%s, %s, %s, 'Sion')", 
        (cities["sion"], cantons["VS"], admins["velocite_vs"])
    )
    # Vevey -> Velocite Riviera
    cur.execute(
        "INSERT INTO city (id, canton_id, admin_region_id, name) VALUES (%s, %s, %s, 'Vevey')", 
        (cities["vevey"], cantons["VD"], admins["velocite_riviera"])
    )
    
    return cantons, cities, admins

def seed_business_entities(cur, cities):
    print("Seeding Business Entities...")

    # HQs
    hqs = {
        "migros": str(uuid.uuid4()),
        "coop": str(uuid.uuid4()),
        "independents": str(uuid.uuid4())
    }
    cur.execute("INSERT INTO hq (id, name) VALUES (%s, 'Migros Valais')", (hqs["migros"],))
    cur.execute("INSERT INTO hq (id, name) VALUES (%s, 'Coop Suisse')", (hqs["coop"],))
    cur.execute("INSERT INTO hq (id, name) VALUES (%s, 'Independants')", (hqs["independents"],))

    # Tariff Grid
    cur.execute("SELECT admin_region_id FROM city WHERE id = %s", (cities["sion"],))
    admin_region_id = cur.fetchone()[0]
    tariff_grid_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO tariff_grid (id, name, admin_region_id, active) VALUES (%s, 'Tarif Sion Standard', %s, true)",
        (tariff_grid_id, admin_region_id)
    )

    # Tariff Versions
    tariff_version_id = str(uuid.uuid4())
    rule = '{"pricing": {"price_per_2_bags": 15.0, "cms_discount": 5.0}}'
    share = '{"client": 33.33, "shop": 33.33, "city": 33.34}'

    cur.execute(
        """
        INSERT INTO tariff_version (id, tariff_grid_id, rule_type, rule, share, valid_from)
        VALUES (%s, %s, 'bags', %s, %s, '2024-01-01')
        """,
        (tariff_version_id, tariff_grid_id, rule, share)
    )

    # Shops
    shops = {
        "migros_metropole": str(uuid.uuid4()),
        "migros_midi": str(uuid.uuid4()),
        "coop_vevey": str(uuid.uuid4()),
        "pizzeria_mario": str(uuid.uuid4())  # Independent
    }

    # Migros Metropole (Sion)
    cur.execute(
        "INSERT INTO shop (id, hq_id, city_id, tariff_version_id, name) VALUES (%s, %s, %s, %s, 'Migros Metropole')",
        (shops["migros_metropole"], hqs["migros"], cities["sion"], tariff_version_id)
    )

    # Migros Midi (Sion)
    cur.execute(
        "INSERT INTO shop (id, hq_id, city_id, tariff_version_id, name) VALUES (%s, %s, %s, %s, 'Migros Midi')",
        (shops["migros_midi"], hqs["migros"], cities["sion"], tariff_version_id)
    )

    # Coop Vevey (Vevey)
    cur.execute(
        "INSERT INTO shop (id, hq_id, city_id, tariff_version_id, name) VALUES (%s, %s, %s, %s, 'Coop Vevey')",
        (shops["coop_vevey"], hqs["coop"], cities["vevey"], tariff_version_id)
    )

    # Pizzeria Mario (Sion, Independent/No HQ)
    cur.execute(
        "INSERT INTO shop (id, hq_id, city_id, tariff_version_id, name) VALUES (%s, %s, %s, %s, 'Chez Mario')",
        (shops["pizzeria_mario"], hqs["independents"], cities["sion"], tariff_version_id)
    )

    return hqs, shops, tariff_version_id


def seed_clients(cur, cities):
    print("Seeding Clients (Recipients)...")
    
    clients = {
        "bob": str(uuid.uuid4()),
        "alice": str(uuid.uuid4())
    }
    
    # Client Standard (Sion)
    cur.execute(
        """
        INSERT INTO client (id, name, address, postal_code, city_name, city_id, is_cms)
        VALUES (%s, 'Bob Standard', 'Rue du Grand-Pont 12', '1950', 'Sion', %s, false)
        """,
        (clients["bob"], cities["sion"])
    )
    
    # Client CMS (Vevey)
    cur.execute(
        """
        INSERT INTO client (id, name, address, postal_code, city_name, city_id, is_cms)
        VALUES (%s, 'Alice CMS', 'Rue du Lac 5', '1800', 'Vevey', %s, true)
        """,
        (clients["alice"], cities["vevey"])
    )
    return clients

def seed_deliveries(cur, hqs, shops, clients, tariff_version_id):
    print("Seeding Deliveries...")
    
    # Retrieve tariff details
    cur.execute("SELECT rule_type, rule, share FROM tariff_version WHERE id = %s", (tariff_version_id,))
    tv_row = cur.fetchone()
    rule_type, rule_json, share_json = tv_row
    
    # Parse rules
    import json
    rule_data = rule_json if isinstance(rule_json, dict) else json.loads(rule_json)
    share_data = share_json if isinstance(share_json, dict) else json.loads(share_json)

    # We only seed for Sion shops because that's where we have tariff setup for now
    sion_shops = [
        ("migros_metropole", shops["migros_metropole"], hqs["migros"]),
        ("migros_midi", shops["migros_midi"], hqs["migros"]),
        ("pizzeria_mario", shops["pizzeria_mario"], hqs["independents"]),
    ]
    
    statuses = ["created", "picked_up", "delivered"]
    
    for i in range(20):
        delivery_id = str(uuid.uuid4())
        
        # Random Date (Last 30 days)
        days_ago = random.randint(0, 30)
        d_date = date.today() - timedelta(days=days_ago)
        
        # Random Shop
        shop_key, shop_id, hq_id = random.choice(sion_shops)
        
        # Random Client (Bob only for Sion)
        client_id = clients["bob"]
        is_cms = False
        
        # Bags
        bags = random.randint(1, 10)
        
        # Compute Financials
        total_price, s_client, s_shop, s_city, s_admin = compute_financials(
            rule_type=rule_type,
            rule=rule_data,
            share=share_data,
            bags=bags,
            order_amount=None,
            is_cms=is_cms
        )
        
        # Get location IDs for the Shop (assuming Sion for simplicity)
        cur.execute("SELECT city_id FROM shop WHERE id = %s", (shop_id,))
        city_id = cur.fetchone()[0]
        
        cur.execute("SELECT canton_id, admin_region_id FROM city WHERE id = %s", (city_id,))
        canton_id, admin_region_id = cur.fetchone()
        
        # Insert Delivery
        cur.execute(
            """
            INSERT INTO delivery (id, shop_id, hq_id, admin_region_id, city_id, canton_id, delivery_date, client_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (delivery_id, shop_id, hq_id, admin_region_id, city_id, canton_id, d_date, client_id)
        )
        
        # Insert Logistics
        cur.execute(
            """
            INSERT INTO delivery_logistics (delivery_id, client_name, address, postal_code, city_name, time_window, bags, order_amount, is_cms)
            VALUES (%s, 'Bob Standard', 'Rue du Grand-Pont 12', '1950', 'Sion', '10:00-12:00', %s, NULL, %s)
            """,
            (delivery_id, bags, is_cms)
        )
        
        # Insert Financial
        cur.execute(
            """
            INSERT INTO delivery_financial (
                delivery_id, tariff_version_id, total_price, share_client, share_shop, share_city, share_admin_region
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (delivery_id, tariff_version_id, total_price, s_client, s_shop, s_city, s_admin)
        )
        
        # Insert Status History
        # We simulate a progression depending on a random final status
        final_status = random.choice(statuses)
        base_time = datetime.combine(d_date, datetime.min.time()) + timedelta(hours=8)
        
        # Created
        cur.execute("INSERT INTO delivery_status (delivery_id, status, updated_at) VALUES (%s, 'created', %s)", (delivery_id, base_time))
        
        if final_status in ["picked_up", "delivered"]:
             cur.execute("INSERT INTO delivery_status (delivery_id, status, updated_at) VALUES (%s, 'picked_up', %s)", (delivery_id, base_time + timedelta(minutes=30)))
             
        if final_status == "delivered":
             cur.execute("INSERT INTO delivery_status (delivery_id, status, updated_at) VALUES (%s, 'delivered', %s)", (delivery_id, base_time + timedelta(minutes=90)))

def main():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Check for pgcrypto
                cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
                
                cleanup_data(cur)
                cantons, cities, admins = seed_geo(cur)
                hqs, shops, tariff_version_id = seed_business_entities(cur, cities)
                clients = seed_clients(cur, cities)
                seed_deliveries(cur, hqs, shops, clients, tariff_version_id)
                
        print("Seeding completed successfully!")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    from datetime import datetime, date
    import uuid
    import psycopg
    main()



