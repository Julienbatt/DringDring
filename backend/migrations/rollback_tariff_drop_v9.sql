-- Rollback for update_tariff_drop_v9.sql

CREATE TABLE IF NOT EXISTS public.tariff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scope TEXT NOT NULL,
    scope_id UUID NOT NULL,
    active BOOLEAN DEFAULT true
);
