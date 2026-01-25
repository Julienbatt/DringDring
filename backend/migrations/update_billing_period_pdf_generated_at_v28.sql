-- Add pdf_generated_at to billing_period for WORM tracking

ALTER TABLE IF EXISTS billing_period
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

UPDATE billing_period
SET pdf_generated_at = COALESCE(pdf_generated_at, frozen_at)
WHERE pdf_url IS NOT NULL;
