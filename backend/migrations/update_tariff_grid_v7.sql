-- Migration: Move legacy tariff/tariff_version to tariff_grid model

-- 1) Create tariff_grid table (if missing)
CREATE TABLE IF NOT EXISTS tariff_grid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    admin_region_id UUID NOT NULL REFERENCES admin_region(id),
    active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_tariff_grid_admin_region_id
    ON tariff_grid(admin_region_id);

-- 2) Add tariff_grid_id to tariff_version
ALTER TABLE tariff_version
ADD COLUMN IF NOT EXISTS tariff_grid_id UUID;

-- 3) Guardrails + backfill from legacy tariff when it exists
DO $$
BEGIN
  IF to_regclass('public.tariff') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM tariff t WHERE t.scope <> 'city') THEN
      RAISE EXCEPTION 'Unsupported tariff.scope detected. This migration only supports scope=city.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM tariff t
      JOIN city c ON c.id = t.scope_id
      WHERE c.admin_region_id IS NULL
    ) THEN
      RAISE EXCEPTION 'One or more city rows have NULL admin_region_id.';
    END IF;

    -- 4) Backfill tariff_grid from legacy tariff
    INSERT INTO tariff_grid (id, name, admin_region_id, active)
    SELECT
        t.id,
        t.name,
        c.admin_region_id,
        COALESCE(t.active, true)
    FROM tariff t
    JOIN city c ON c.id = t.scope_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 5) Backfill tariff_version.tariff_grid_id (1:1 mapping with legacy tariff_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tariff_version'
      AND column_name = 'tariff_id'
  ) THEN
    UPDATE tariff_version
    SET tariff_grid_id = tariff_id
    WHERE tariff_grid_id IS NULL;
  END IF;
END $$;

-- 6) Validate backfill
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM tariff_version WHERE tariff_grid_id IS NULL) THEN
    RAISE EXCEPTION 'tariff_version.tariff_grid_id is NULL after backfill.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM tariff_version tv
    LEFT JOIN tariff_grid tg ON tg.id = tv.tariff_grid_id
    WHERE tg.id IS NULL
  ) THEN
    RAISE EXCEPTION 'tariff_version.tariff_grid_id references missing tariff_grid rows.';
  END IF;
END $$;

-- 7) Enforce constraints + index
ALTER TABLE tariff_version
ADD CONSTRAINT tariff_version_tariff_grid_fkey
FOREIGN KEY (tariff_grid_id) REFERENCES tariff_grid(id);

ALTER TABLE tariff_version
ALTER COLUMN tariff_grid_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tariff_version_tariff_grid_id
    ON tariff_version(tariff_grid_id);
