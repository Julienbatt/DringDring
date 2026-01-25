-- Add legacy comment column for billing_period (compat with older queries)

ALTER TABLE public.billing_period
ADD COLUMN IF NOT EXISTS comment TEXT;

UPDATE public.billing_period
SET comment = frozen_comment
WHERE comment IS NULL
  AND frozen_comment IS NOT NULL;
