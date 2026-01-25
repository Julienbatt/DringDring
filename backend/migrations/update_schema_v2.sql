-- Schema Update V2
-- 1. Update Admin Region
ALTER TABLE admin_region ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE admin_region ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 2. Create Courier Table
CREATE TABLE IF NOT EXISTS courier (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Optional link if they have login
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    courier_number TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    email TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Link courier to shop or region ? 
-- User said "une liste de coursiers qui ont des noms prénoms..." for "Admin Région".
-- So likely couriers belong to a hierarchy.
-- Let's add optional links, but typically couriers might be managed by Admin Region or Shop.
-- Given "Admin région a ... une liste de coursiers", implied hierarchy: Admin Region -> Courier.

ALTER TABLE courier ADD COLUMN IF NOT EXISTS admin_region_id UUID REFERENCES admin_region(id);
ALTER TABLE courier ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shop(id);

-- Enable RLS
ALTER TABLE courier ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin Region can see/manage their couriers
DROP POLICY IF EXISTS admin_region_courier_policy ON courier;
CREATE POLICY admin_region_courier_policy ON courier FOR ALL USING (
   admin_region_id = get_my_admin_region_id()
);

-- Super Admin Bypass (re-using valid syntax from previous checks)
DROP POLICY IF EXISTS service_role_bypass_courier ON courier;
CREATE POLICY service_role_bypass_courier ON courier USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
);
