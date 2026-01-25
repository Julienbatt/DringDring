-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up existing tables (if any, use with caution)
-- DROP TABLE IF EXISTS delivery_status CASCADE;
-- DROP TABLE IF EXISTS delivery_financial CASCADE;
-- DROP TABLE IF EXISTS delivery_logistics CASCADE;
-- DROP TABLE IF EXISTS delivery CASCADE;
-- DROP TABLE IF EXISTS client CASCADE;
-- DROP TABLE IF EXISTS billing_period CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS shop CASCADE;
-- DROP TABLE IF EXISTS tariff_version CASCADE;
-- DROP TABLE IF EXISTS tariff CASCADE;
-- DROP TABLE IF EXISTS hq CASCADE;
-- DROP TABLE IF EXISTS city CASCADE;
-- DROP TABLE IF EXISTS admin_region CASCADE;
-- DROP TABLE IF EXISTS canton CASCADE;


-- 1. Geographic Tables
CREATE TABLE IF NOT EXISTS canton (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS admin_region (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canton_id UUID REFERENCES canton(id),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    address TEXT,
    contact_email TEXT,
    contact_person TEXT,
    phone TEXT
);

CREATE TABLE IF NOT EXISTS city (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canton_id UUID REFERENCES canton(id),
    admin_region_id UUID REFERENCES admin_region(id),
    name TEXT NOT NULL
);

-- 2. Business Entities
CREATE TABLE IF NOT EXISTS hq (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tariff_grid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    admin_region_id UUID NOT NULL, -- Simplified from scope/scope_id for now as code uses admin_region_id
    active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS tariff_version (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tariff_grid_id UUID REFERENCES tariff_grid(id),
    rule_type TEXT NOT NULL,
    rule JSONB NOT NULL,
    share JSONB NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE, -- Added support for expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS shop (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hq_id UUID REFERENCES hq(id),
    city_id UUID REFERENCES city(id),
    tariff_version_id UUID REFERENCES tariff_version(id),
    name TEXT NOT NULL,
    address TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT
);

-- 3. Users & Profiles
-- Note: auth.users is managed by Supabase. We only create public.profiles.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin_region', 'city', 'hq', 'shop', 'courier', 'customer')),
    admin_region_id UUID REFERENCES admin_region(id),
    city_id UUID REFERENCES city(id),
    hq_id UUID REFERENCES hq(id),
    shop_id UUID REFERENCES shop(id),
    client_id UUID REFERENCES client(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Clients (Recipients)
CREATE TABLE IF NOT EXISTS client (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    postal_code TEXT,
    city_name TEXT,
    city_id UUID REFERENCES city(id),
    is_cms BOOLEAN DEFAULT false
);

-- 5. Deliveries
CREATE TABLE IF NOT EXISTS delivery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES shop(id),
    hq_id UUID REFERENCES hq(id),
    admin_region_id UUID REFERENCES admin_region(id),
    city_id UUID REFERENCES city(id),
    canton_id UUID REFERENCES canton(id),
    delivery_date DATE NOT NULL,
    client_id UUID REFERENCES client(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS delivery_logistics (
    delivery_id UUID PRIMARY KEY REFERENCES delivery(id) ON DELETE CASCADE,
    client_name TEXT,
    address TEXT,
    postal_code TEXT,
    city_name TEXT,
    time_window TEXT,
    short_code TEXT,
    bags INTEGER,
    order_amount DECIMAL(10, 2),
    is_cms BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS delivery_financial (
    delivery_id UUID PRIMARY KEY REFERENCES delivery(id) ON DELETE CASCADE,
    tariff_version_id UUID REFERENCES tariff_version(id),
    total_price DECIMAL(10, 2) NOT NULL,
    share_client DECIMAL(10, 2) NOT NULL DEFAULT 0,
    share_shop DECIMAL(10, 2) NOT NULL DEFAULT 0,
    share_city DECIMAL(10, 2) NOT NULL DEFAULT 0,
    share_admin_region DECIMAL(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS delivery_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID REFERENCES delivery(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('created', 'assigned', 'picked_up', 'delivered', 'issue', 'validated', 'invoiced', 'cancelled')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Billing Periods (Frozen)
  CREATE TABLE IF NOT EXISTS billing_period (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      shop_id UUID REFERENCES shop(id),
      period_month DATE NOT NULL, -- First day of the month
      frozen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
      frozen_by UUID REFERENCES auth.users(id),
      frozen_by_name TEXT,
      pdf_url TEXT,
      pdf_sha256 TEXT,
      pdf_generated_at TIMESTAMP WITH TIME ZONE,
      frozen_comment TEXT,
      UNIQUE(shop_id, period_month)
  );


-- 7. Functions & Policies (RLS)

-- Helper function for Admin Region
CREATE OR REPLACE FUNCTION get_my_admin_region_id() RETURNS uuid AS $$
DECLARE
    claims jsonb;
    region_id text;
BEGIN
    -- Try to get claims from request.jwt.claims
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        claims := NULL;
    END;
    
    IF claims IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check app_metadata
    region_id := claims -> 'app_metadata' ->> 'admin_region_id';
    IF region_id IS NOT NULL THEN
        RETURN region_id::uuid;
    END IF;
    
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS
ALTER TABLE canton ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_region ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_grid ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariff_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE city ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_financial ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_period ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Service Role / Super Admin Bypass
DROP POLICY IF EXISTS service_role_bypass_city ON city;
CREATE POLICY service_role_bypass_city ON city USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_shop ON shop;
CREATE POLICY service_role_bypass_shop ON shop USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_delivery ON delivery;
CREATE POLICY service_role_bypass_delivery ON delivery USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_financial ON delivery_financial;
CREATE POLICY service_role_bypass_financial ON delivery_financial USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_logistics ON delivery_logistics;
CREATE POLICY service_role_bypass_logistics ON delivery_logistics USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_billing ON billing_period;
CREATE POLICY service_role_bypass_billing ON billing_period USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_profiles ON public.profiles;
CREATE POLICY service_role_bypass_profiles ON public.profiles USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_canton ON canton;
CREATE POLICY service_role_bypass_canton ON canton USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_admin_region ON admin_region;
CREATE POLICY service_role_bypass_admin_region ON admin_region USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_hq ON hq;
CREATE POLICY service_role_bypass_hq ON hq USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_tariff_grid ON tariff_grid;
CREATE POLICY service_role_bypass_tariff_grid ON tariff_grid USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS service_role_bypass_tariff_version ON tariff_version;
CREATE POLICY service_role_bypass_tariff_version ON tariff_version USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

-- Admin Region Policies (Selection)
DROP POLICY IF EXISTS admin_region_city_policy ON city;
CREATE POLICY admin_region_city_policy ON city FOR SELECT USING (
    admin_region_id = get_my_admin_region_id() OR get_my_admin_region_id() IS NULL -- Allow others if not admin_region
);

DROP POLICY IF EXISTS canton_read_policy ON canton;
CREATE POLICY canton_read_policy ON canton FOR SELECT USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
);

DROP POLICY IF EXISTS admin_region_read_policy ON admin_region;
CREATE POLICY admin_region_read_policy ON admin_region FOR SELECT USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
);

DROP POLICY IF EXISTS hq_read_policy ON hq;
CREATE POLICY hq_read_policy ON hq FOR SELECT USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
);

DROP POLICY IF EXISTS tariff_grid_read_policy ON tariff_grid;
CREATE POLICY tariff_grid_read_policy ON tariff_grid FOR SELECT USING (
    admin_region_id = get_my_admin_region_id() OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);

DROP POLICY IF EXISTS tariff_grid_manage_policy ON tariff_grid;
CREATE POLICY tariff_grid_manage_policy ON tariff_grid
    FOR ALL
    USING (
        admin_region_id = get_my_admin_region_id() OR
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    )
    WITH CHECK (
        admin_region_id = get_my_admin_region_id() OR
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

DROP POLICY IF EXISTS tariff_version_read_policy ON tariff_version;
CREATE POLICY tariff_version_read_policy ON tariff_version FOR SELECT USING (
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
        AND tariff_grid_id IN (
            SELECT id FROM tariff_grid
            WHERE admin_region_id = get_my_admin_region_id()
        )
    )
    OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'shop'
        AND EXISTS (
            SELECT 1
            FROM shop s
            WHERE s.id = NULLIF(
                current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
                ''
            )::uuid
            AND s.tariff_version_id = tariff_version.id
        )
    )
    OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'city'
        AND EXISTS (
            SELECT 1
            FROM shop s
            WHERE s.city_id = NULLIF(
                current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
                ''
            )::uuid
            AND s.tariff_version_id = tariff_version.id
        )
    )
    OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'hq'
        AND EXISTS (
            SELECT 1
            FROM shop s
            WHERE s.hq_id = NULLIF(
                current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
                ''
            )::uuid
            AND s.tariff_version_id = tariff_version.id
        )
    )
);

DROP POLICY IF EXISTS tariff_version_manage_policy ON tariff_version;
CREATE POLICY tariff_version_manage_policy ON tariff_version
    FOR ALL
    USING (
        tariff_grid_id IN (
            SELECT id FROM tariff_grid
            WHERE admin_region_id = get_my_admin_region_id()
        ) OR
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    )
    WITH CHECK (
        tariff_grid_id IN (
            SELECT id FROM tariff_grid
            WHERE admin_region_id = get_my_admin_region_id()
        ) OR
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

DROP POLICY IF EXISTS admin_region_shop_policy ON shop;
CREATE POLICY admin_region_shop_policy ON shop FOR ALL USING (
    city_id IN (SELECT id FROM city WHERE admin_region_id = get_my_admin_region_id())
);

DROP POLICY IF EXISTS admin_region_delivery_policy ON delivery;
CREATE POLICY admin_region_delivery_policy ON delivery FOR SELECT USING (
    shop_id IN (
        SELECT s.id FROM shop s 
        JOIN city c ON c.id = s.city_id 
        WHERE c.admin_region_id = get_my_admin_region_id()
    )
);

-- 8. Views

-- View: City Billing Shops
-- Groups delivery data by shop for a given month, for City views.
DROP VIEW IF EXISTS view_city_billing_shops CASCADE;
CREATE OR REPLACE VIEW view_city_billing_shops
WITH (security_invoker = true) AS
SELECT
    s.id AS shop_id,
    s.name AS shop_name,
    c.id AS city_id,
    c.name AS city_name,
    date_trunc('month', d.delivery_date)::date AS billing_month,
    COUNT(d.id) AS total_deliveries,
    SUM(f.share_city) AS total_subvention_due, -- City share is the subvention
    SUM(f.total_price) AS total_volume_chf
FROM delivery d
JOIN shop s ON s.id = d.shop_id
JOIN city c ON c.id = s.city_id
JOIN delivery_financial f ON f.delivery_id = d.id
GROUP BY s.id, s.name, c.id, c.name, date_trunc('month', d.delivery_date)::date;

-- View: City Billing (Aggregated)
-- Aggregates everything for the city for a month.
DROP VIEW IF EXISTS view_city_billing CASCADE;
CREATE OR REPLACE VIEW view_city_billing
WITH (security_invoker = true) AS
SELECT
    c.id AS city_id,
    c.name AS city_name,
    date_trunc('month', d.delivery_date)::date AS billing_month,
    COUNT(d.id) AS total_deliveries,
    SUM(f.share_city) AS total_amount_due, -- What city pays
    SUM(f.total_price) AS total_volume_chf
FROM delivery d
JOIN shop s ON s.id = d.shop_id
JOIN city c ON c.id = s.city_id
JOIN delivery_financial f ON f.delivery_id = d.id
GROUP BY c.id, c.name, date_trunc('month', d.delivery_date)::date;

-- View: HQ Billing Shops
-- Shows billing data for HQ users.
DROP VIEW IF EXISTS view_hq_billing_shops CASCADE;
CREATE OR REPLACE VIEW view_hq_billing_shops
WITH (security_invoker = true) AS
SELECT
    h.name AS hq_name,
    s.id AS shop_id,
    s.name AS shop_name,
    c.name AS city_name,
    date_trunc('month', d.delivery_date)::date AS billing_month,
    COUNT(d.id) AS total_deliveries,
    SUM(f.share_city + f.share_admin_region) AS total_subvention_due, -- Public money involved
    SUM(f.total_price) AS total_volume_chf,
    (bp.id IS NOT NULL) AS is_frozen
FROM delivery d
JOIN shop s ON s.id = d.shop_id
JOIN city c ON c.id = s.city_id
LEFT JOIN hq h ON h.id = s.hq_id
JOIN delivery_financial f ON f.delivery_id = d.id
LEFT JOIN billing_period bp ON bp.shop_id = s.id AND bp.period_month = date_trunc('month', d.delivery_date)::date
GROUP BY h.name, s.id, s.name, c.name, date_trunc('month', d.delivery_date)::date, bp.id;

