-- Ensure tariff_version.share includes admin_region or velocite key

DO $$
BEGIN
  IF to_regclass('public.tariff_version') IS NOT NULL THEN
    UPDATE public.tariff_version
    SET share = jsonb_set(
      COALESCE(share, '{}'::jsonb),
      '{admin_region}',
      '0'::jsonb,
      true
    )
    WHERE NOT (share ? 'admin_region')
      AND NOT (share ? 'velocite');
  END IF;
END $$;
