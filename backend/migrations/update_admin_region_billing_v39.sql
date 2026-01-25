-- Admin region billing (creditor) fields for per-region QR invoices

ALTER TABLE public.admin_region
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS billing_iban TEXT,
ADD COLUMN IF NOT EXISTS billing_street TEXT,
ADD COLUMN IF NOT EXISTS billing_house_num TEXT,
ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT;

UPDATE public.admin_region
SET billing_name = COALESCE(billing_name, name),
    billing_country = COALESCE(billing_country, 'CH')
WHERE billing_name IS NULL
   OR billing_country IS NULL;
