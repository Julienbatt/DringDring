-- Seed Data Script
-- Run this AFTER generated_schema.sql

-- 1. Clean (Optional - comment out if you want to keep data)
-- TRUNCATE TABLE public.profiles, delivery, shop, hq, city, admin_region CASCADE;
-- DELETE FROM auth.users WHERE email LIKE '%@dringdring.ch';

-- 2. Variables (using a DO block due to SQL limitation, or just hardcoded inserts)
-- We will use hardcoded UUIDs for consistency or let DB generate them.
-- For auth.users, we need to know the ID to link profile.

-- Helper to create user if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    -- Hardcoded defaults (used only if creating new)
    v_canton_vs_id UUID;
    v_canton_vd_id UUID;
    
    v_admin_vs_id UUID;
    v_admin_riv_id UUID;
    
    v_city_sion_id UUID;
    v_city_vevey_id UUID;
    
    v_hq_migros_id UUID;
    v_hq_coop_id UUID;
    
    v_tariff_version_id UUID;
    v_tariff_grid_id UUID;
    
    v_shop_metro_id UUID;
    
    v_user_super_id UUID;
    v_user_admin_vs_id UUID;
    v_user_city_sion_id UUID;
    v_user_hq_migros_id UUID;
    v_user_shop_metro_id UUID;
    
BEGIN

    -- 2.1 Geography
    
    -- Canton VS
    INSERT INTO canton (name, code) VALUES ('Valais', 'VS')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_canton_vs_id;

    -- Canton VD
    INSERT INTO canton (name, code) VALUES ('Vaud', 'VD')
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_canton_vd_id;

    -- Admin Region VS
    -- Note: admin_region has no unique code, assuming name is unique or just checking existence
    SELECT id INTO v_admin_vs_id FROM admin_region WHERE name = 'Vélocité Valais' LIMIT 1;
    IF v_admin_vs_id IS NULL THEN
        INSERT INTO admin_region (canton_id, name, active) 
        VALUES (v_canton_vs_id, 'Vélocité Valais', true)
        RETURNING id INTO v_admin_vs_id;
    END IF;

    -- Admin Region Riviera
    SELECT id INTO v_admin_riv_id FROM admin_region WHERE name = 'Vélocité Riviera' LIMIT 1;
    IF v_admin_riv_id IS NULL THEN
        INSERT INTO admin_region (canton_id, name, active) 
        VALUES (v_canton_vd_id, 'Vélocité Riviera', true)
        RETURNING id INTO v_admin_riv_id;
    END IF;
    
    -- City Sion
    SELECT id INTO v_city_sion_id FROM city WHERE name = 'Sion' LIMIT 1;
    IF v_city_sion_id IS NULL THEN
        INSERT INTO city (canton_id, admin_region_id, name) 
        VALUES (v_canton_vs_id, v_admin_vs_id, 'Sion')
        RETURNING id INTO v_city_sion_id;
    END IF;

    -- City Vevey
    SELECT id INTO v_city_vevey_id FROM city WHERE name = 'Vevey' LIMIT 1;
    IF v_city_vevey_id IS NULL THEN
        INSERT INTO city (canton_id, admin_region_id, name) 
        VALUES (v_canton_vd_id, v_admin_riv_id, 'Vevey')
        RETURNING id INTO v_city_vevey_id;
    END IF;

    -- 2.2 HQs
    SELECT id INTO v_hq_migros_id FROM hq WHERE name = 'Migros Valais' LIMIT 1;
    IF v_hq_migros_id IS NULL THEN
        INSERT INTO hq (name) VALUES ('Migros Valais') RETURNING id INTO v_hq_migros_id;
    END IF;
    
    SELECT id INTO v_hq_coop_id FROM hq WHERE name = 'Coop Suisse' LIMIT 1;
    IF v_hq_coop_id IS NULL THEN
        INSERT INTO hq (name) VALUES ('Coop Suisse') RETURNING id INTO v_hq_coop_id;
    END IF;

    -- 2.3 Tariff Grid
    SELECT id INTO v_tariff_grid_id FROM tariff_grid WHERE name = 'Tarif Sion Standard' LIMIT 1;
    IF v_tariff_grid_id IS NULL THEN
        INSERT INTO tariff_grid (name, admin_region_id, active) 
        VALUES ('Tarif Sion Standard', v_admin_vs_id, true)
        RETURNING id INTO v_tariff_grid_id;
        
        -- Create Version only if new grid (simplification)
        INSERT INTO tariff_version (tariff_grid_id, rule_type, rule, share, valid_from)
        VALUES (
            v_tariff_grid_id, 
            'bags', 
            '{"pricing": {"price_per_2_bags": 15.0, "cms_discount": 5.0}}', 
            '{"client": 33.33, "shop": 33.33, "city": 33.34}', 
            '2024-01-01'
        ) RETURNING id INTO v_tariff_version_id;
    ELSE
        -- Just grab the latest version or any
        SELECT id INTO v_tariff_version_id FROM tariff_version WHERE tariff_grid_id = v_tariff_grid_id LIMIT 1;
    END IF;

    -- 2.4 Shops
    SELECT id INTO v_shop_metro_id FROM shop WHERE name = 'Migros Métropole' LIMIT 1;
    IF v_shop_metro_id IS NULL THEN
        INSERT INTO shop (hq_id, city_id, tariff_version_id, name) 
        VALUES (v_hq_migros_id, v_city_sion_id, v_tariff_version_id, 'Migros Métropole')
        RETURNING id INTO v_shop_metro_id;
    END IF;

    -- 3. Users (Auth & Profile)
    
    -- Super Admin
    SELECT id INTO v_user_super_id FROM auth.users WHERE email = 'superadmin@dringdring.ch';
    IF v_user_super_id IS NULL THEN
        INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (
            '00000000-0000-0000-0000-000000000000', 
            'superadmin@dringdring.ch', 
            crypt('password', gen_salt('bf')), 
            now(), 
            '{"provider":"email","providers":["email"],"role":"super_admin"}', 
            '{}', 
            'authenticated', 
            'authenticated'
        ) RETURNING id INTO v_user_super_id;
    END IF;
    -- Upsert Profile
    INSERT INTO public.profiles (id, role) VALUES (v_user_super_id, 'super_admin')
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

    -- Admin Region
    SELECT id INTO v_user_admin_vs_id FROM auth.users WHERE email = 'admin_vs@dringdring.ch';
    IF v_user_admin_vs_id IS NULL THEN
        INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (
            '00000000-0000-0000-0000-000000000000', 
            'admin_vs@dringdring.ch', 
            crypt('password', gen_salt('bf')), 
            now(), 
            '{"provider":"email","providers":["email"],"role":"admin_region","admin_region_id":"' || v_admin_vs_id || '"}', 
            '{}',
            'authenticated', 
            'authenticated'
        ) RETURNING id INTO v_user_admin_vs_id;
    END IF;
    INSERT INTO public.profiles (id, role, admin_region_id) VALUES (v_user_admin_vs_id, 'admin_region', v_admin_vs_id)
    ON CONFLICT (id) DO UPDATE SET role = 'admin_region', admin_region_id = v_admin_vs_id;

    -- City User
    SELECT id INTO v_user_city_sion_id FROM auth.users WHERE email = 'sion@dringdring.ch';
    IF v_user_city_sion_id IS NULL THEN
         INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES ( 
            '00000000-0000-0000-0000-000000000000', 
            'sion@dringdring.ch', 
            crypt('password', gen_salt('bf')), 
            now(), 
            '{"provider":"email","providers":["email"],"role":"city","city_id":"' || v_city_sion_id || '"}', 
            '{}', 
            'authenticated', 
            'authenticated'
        ) RETURNING id INTO v_user_city_sion_id;
    END IF;
    INSERT INTO public.profiles (id, role, city_id) VALUES (v_user_city_sion_id, 'city', v_city_sion_id)
    ON CONFLICT (id) DO UPDATE SET role = 'city', city_id = v_city_sion_id;

    -- HQ User
    SELECT id INTO v_user_hq_migros_id FROM auth.users WHERE email = 'migros@dringdring.ch';
    IF v_user_hq_migros_id IS NULL THEN
        INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            'migros@dringdring.ch',
            crypt('password', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"],"role":"hq","hq_id":"' || v_hq_migros_id || '"}',
            '{}',
            'authenticated',
            'authenticated'
        ) RETURNING id INTO v_user_hq_migros_id;
    END IF;
    INSERT INTO public.profiles (id, role, hq_id) VALUES (v_user_hq_migros_id, 'hq', v_hq_migros_id)
    ON CONFLICT (id) DO UPDATE SET role = 'hq', hq_id = v_hq_migros_id;

    -- Shop User
    SELECT id INTO v_user_shop_metro_id FROM auth.users WHERE email = 'shop_metropole@dringdring.ch';
    IF v_user_shop_metro_id IS NULL THEN
        INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (
            '00000000-0000-0000-0000-000000000000', 
            'shop_metropole@dringdring.ch', 
            crypt('password', gen_salt('bf')), 
            now(), 
            '{"provider":"email","providers":["email"],"role":"shop","shop_id":"' || v_shop_metro_id || '","hq_id":"' || v_hq_migros_id || '"}', 
            '{}', 
            'authenticated', 
            'authenticated'
        ) RETURNING id INTO v_user_shop_metro_id;
    END IF;
    INSERT INTO public.profiles (id, role, shop_id, hq_id) VALUES (v_user_shop_metro_id, 'shop', v_shop_metro_id, v_hq_migros_id)
    ON CONFLICT (id) DO UPDATE SET role = 'shop', shop_id = v_shop_metro_id, hq_id = v_hq_migros_id;

END $$;
