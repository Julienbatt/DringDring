-- Schema Update V3
-- Remove shop_id from courier as they are managed by Admin Region
ALTER TABLE courier DROP COLUMN IF EXISTS shop_id;
