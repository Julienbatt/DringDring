-- Billing document snapshots + WORM metadata
ALTER TABLE public.billing_document
ADD COLUMN IF NOT EXISTS recipient_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS recipient_street_snapshot TEXT,
ADD COLUMN IF NOT EXISTS recipient_house_num_snapshot TEXT,
ADD COLUMN IF NOT EXISTS recipient_postal_code_snapshot TEXT,
ADD COLUMN IF NOT EXISTS recipient_city_snapshot TEXT,
ADD COLUMN IF NOT EXISTS recipient_country_snapshot TEXT,
ADD COLUMN IF NOT EXISTS pdf_sha256 TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;
