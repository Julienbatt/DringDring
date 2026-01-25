-- Cleanup legacy tariff_id from tariff_version

DO $$
DECLARE
  constraint_name text;
BEGIN
  IF to_regclass('public.tariff_version') IS NOT NULL THEN
    SELECT conname
      INTO constraint_name
      FROM pg_constraint con
      JOIN pg_attribute att
        ON att.attrelid = con.conrelid
       AND att.attnum = ANY(con.conkey)
     WHERE con.conrelid = 'public.tariff_version'::regclass
       AND att.attname = 'tariff_id'
       AND con.contype = 'f'
     LIMIT 1;

    IF constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.tariff_version DROP CONSTRAINT %I', constraint_name);
    END IF;

    DROP INDEX IF EXISTS idx_tariff_version_tariff_id;
    ALTER TABLE public.tariff_version DROP COLUMN IF EXISTS tariff_id;
  END IF;
END $$;
