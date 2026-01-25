-- Add short_code to delivery_logistics for courier/share flows

ALTER TABLE delivery_logistics
ADD COLUMN IF NOT EXISTS short_code TEXT;
