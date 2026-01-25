-- Convert delivery_status to history table (multiple rows per delivery)

ALTER TABLE delivery_status
DROP CONSTRAINT IF EXISTS delivery_status_pkey;

ALTER TABLE delivery_status
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

UPDATE delivery_status
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE delivery_status
ALTER COLUMN id SET NOT NULL;

ALTER TABLE delivery_status
ADD CONSTRAINT delivery_status_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS idx_delivery_status_delivery_id
ON delivery_status (delivery_id);
