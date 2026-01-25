-- Rollback for update_tariff_grid_v7.sql

ALTER TABLE public.tariff_version
DROP CONSTRAINT IF EXISTS tariff_version_tariff_grid_fkey;

DROP INDEX IF EXISTS idx_tariff_version_tariff_grid_id;

ALTER TABLE public.tariff_version
DROP COLUMN IF EXISTS tariff_grid_id;

DROP INDEX IF EXISTS idx_tariff_grid_admin_region_id;

DROP TABLE IF EXISTS public.tariff_grid;
