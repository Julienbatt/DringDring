-- Billing document snapshots (creditor + reference)

ALTER TABLE public.billing_document
ADD COLUMN IF NOT EXISTS creditor_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS creditor_iban_snapshot TEXT,
ADD COLUMN IF NOT EXISTS creditor_street_snapshot TEXT,
ADD COLUMN IF NOT EXISTS creditor_house_num_snapshot TEXT,
ADD COLUMN IF NOT EXISTS creditor_postal_code_snapshot TEXT,
ADD COLUMN IF NOT EXISTS creditor_city_snapshot TEXT,
ADD COLUMN IF NOT EXISTS creditor_country_snapshot TEXT,
ADD COLUMN IF NOT EXISTS reference_snapshot TEXT,
ADD COLUMN IF NOT EXISTS payment_message_snapshot TEXT;
