-- Add new fields to client table
ALTER TABLE client ADD COLUMN IF NOT EXISTS floor TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS door_code TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE client ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Update RLS if necessary (Client usually doesn't have RLS enabled in the schema file I saw? 
-- Line 192+ only enables for city, shop, delivery... I don't see ALTER TABLE client ENABLE ROW LEVEL SECURITY.
-- So python does the check. That's fine for now, user said "Minimal".)
