-- Add frozen_comment to billing_period for audit notes

ALTER TABLE IF EXISTS billing_period
ADD COLUMN IF NOT EXISTS frozen_comment TEXT;
