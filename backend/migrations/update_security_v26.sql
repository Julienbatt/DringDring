-- Tariff grid read policy: allow HQ/City/Shop to read grids they use

DO $$
BEGIN
  IF to_regclass('public.tariff_grid') IS NOT NULL THEN
    DROP POLICY IF EXISTS tariff_grid_read_policy ON public.tariff_grid;
    CREATE POLICY tariff_grid_read_policy ON public.tariff_grid FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
        AND admin_region_id = get_my_admin_region_id()
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'shop'
        AND EXISTS (
          SELECT 1
          FROM public.shop s
          JOIN public.tariff_version tv ON s.tariff_version_id = tv.id
          WHERE s.id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
            ''
          )::uuid
            AND tv.tariff_grid_id = public.tariff_grid.id
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'city'
        AND EXISTS (
          SELECT 1
          FROM public.shop s
          JOIN public.tariff_version tv ON s.tariff_version_id = tv.id
          WHERE s.city_id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
            ''
          )::uuid
            AND tv.tariff_grid_id = public.tariff_grid.id
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'hq'
        AND EXISTS (
          SELECT 1
          FROM public.shop s
          JOIN public.tariff_version tv ON s.tariff_version_id = tv.id
          WHERE s.hq_id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
            ''
          )::uuid
            AND tv.tariff_grid_id = public.tariff_grid.id
        )
      )
    );
  END IF;
END $$;
