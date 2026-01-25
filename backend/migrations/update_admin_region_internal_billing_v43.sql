-- Add internal billing (delivery company) fields for per-region internal invoices
ALTER TABLE public.admin_region
ADD COLUMN IF NOT EXISTS internal_billing_name TEXT,
ADD COLUMN IF NOT EXISTS internal_billing_iban TEXT,
ADD COLUMN IF NOT EXISTS internal_billing_street TEXT,
ADD COLUMN IF NOT EXISTS internal_billing_house_num TEXT,
ADD COLUMN IF NOT EXISTS internal_billing_postal_code TEXT,
ADD COLUMN IF NOT EXISTS internal_billing_city TEXT,
ADD COLUMN IF NOT EXISTS internal_billing_country TEXT;
