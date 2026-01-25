-- Tariff constraints: ensure a single active version per grid and valid ranges

DO $$
BEGIN
  IF to_regclass('public.tariff_version') IS NOT NULL THEN
    -- Close any extra "active" versions to avoid conflicts (keep latest by valid_from/created_at)
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY tariff_grid_id
               ORDER BY valid_from DESC, created_at DESC, id DESC
             ) AS rn
      FROM public.tariff_version
      WHERE valid_to IS NULL
    )
    UPDATE public.tariff_version tv
    SET valid_to = now()
    FROM ranked r
    WHERE tv.id = r.id
      AND r.rn > 1;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'tariff_version_valid_range'
    ) THEN
      ALTER TABLE public.tariff_version
      ADD CONSTRAINT tariff_version_valid_range
      CHECK (valid_to IS NULL OR valid_to >= valid_from);
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS uniq_tariff_version_active
      ON public.tariff_version (tariff_grid_id)
      WHERE valid_to IS NULL;

    CREATE INDEX IF NOT EXISTS idx_tariff_version_grid_valid_from
      ON public.tariff_version (tariff_grid_id, valid_from DESC);
  END IF;
END $$;
