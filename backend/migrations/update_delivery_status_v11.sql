-- Expand delivery status values to match application flow

ALTER TABLE delivery_status
DROP CONSTRAINT IF EXISTS delivery_status_status_check;

ALTER TABLE delivery_status
ADD CONSTRAINT delivery_status_status_check
CHECK (
    status IN (
        'created',
        'assigned',
        'picked_up',
        'delivered',
        'issue',
        'validated',
        'invoiced',
        'cancelled'
    )
);
