-- Add missing admin_region contact fields used by API/UI

ALTER TABLE admin_region
ADD COLUMN IF NOT EXISTS contact_person TEXT;

ALTER TABLE admin_region
ADD COLUMN IF NOT EXISTS phone TEXT;
