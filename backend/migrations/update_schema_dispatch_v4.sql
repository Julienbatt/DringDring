-- Migration: Dispatch & Operational Flow
-- 1. Add courier_id to delivery table
ALTER TABLE delivery
ADD COLUMN IF NOT EXISTS courier_id UUID;

ALTER TABLE delivery
DROP CONSTRAINT IF EXISTS delivery_courier_id_fkey;

ALTER TABLE delivery
ADD CONSTRAINT delivery_courier_id_fkey
FOREIGN KEY (courier_id) REFERENCES courier(id);

-- 2. Add notes to delivery_logistics table
ALTER TABLE delivery_logistics 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Add pickup_time/window details if needed (Plan mentioned time_window, schema already has time_window TEXT in logistics)
-- We will just ensure it's there. It is according to generated_schema.sql.

-- 4. Enable RLS for courier view if needed?
-- Existing policies:
-- admin_region_delivery_policy ON delivery FOR SELECT works by shop/city.
-- We might need a policy for couriers to see their own deliveries later.

-- For now, just the columns.
