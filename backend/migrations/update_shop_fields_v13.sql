-- Add missing shop contact fields used by admin UI

ALTER TABLE shop ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE shop ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE shop ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE shop ADD COLUMN IF NOT EXISTS phone TEXT;
