-- Add internal billing logo path for per-region internal invoices
ALTER TABLE public.admin_region
ADD COLUMN IF NOT EXISTS internal_billing_logo_path TEXT;
