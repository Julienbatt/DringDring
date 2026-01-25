-- Rollback for update_tariff_cleanup_v8.sql

ALTER TABLE public.tariff_version
ADD COLUMN IF NOT EXISTS tariff_id UUID;

UPDATE public.tariff_version
SET tariff_id = tariff_grid_id
WHERE tariff_id IS NULL;

DO $$
BEGIN
  IF to_regclass('public.tariff') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.tariff_version tv
      LEFT JOIN public.tariff t ON t.id = tv.tariff_id
      WHERE tv.tariff_id IS NOT NULL
        AND t.id IS NULL
    ) THEN
      ALTER TABLE public.tariff_version
      ADD CONSTRAINT tariff_version_tariff_id_fkey
      FOREIGN KEY (tariff_id) REFERENCES public.tariff(id);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tariff_version_tariff_id
    ON public.tariff_version(tariff_id);
