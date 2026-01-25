-- Add per-region billing logo path for invoice branding
ALTER TABLE public.admin_region
ADD COLUMN IF NOT EXISTS billing_logo_path TEXT;
