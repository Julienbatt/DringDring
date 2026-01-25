-- Security hardening: remove user_metadata usage in RLS

-- Ensure helper function reads only app_metadata
CREATE OR REPLACE FUNCTION public.get_my_admin_region_id() RETURNS uuid AS $$
DECLARE
    claims jsonb;
    region_id text;
BEGIN
    BEGIN
        claims := current_setting('request.jwt.claims', true)::jsonb;
    EXCEPTION WHEN OTHERS THEN
        claims := NULL;
    END;

    IF claims IS NULL THEN
        RETURN NULL;
    END IF;

    region_id := claims -> 'app_metadata' ->> 'admin_region_id';
    IF region_id IS NOT NULL THEN
        RETURN region_id::uuid;
    END IF;

    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

DO $$
BEGIN
  IF to_regclass('public.tariff_grid') IS NOT NULL THEN
    DROP POLICY IF EXISTS tariff_grid_read_policy ON public.tariff_grid;
    CREATE POLICY tariff_grid_read_policy ON public.tariff_grid FOR SELECT USING (
      admin_region_id = get_my_admin_region_id() OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );
  END IF;

  IF to_regclass('public.tariff_version') IS NOT NULL THEN
    DROP POLICY IF EXISTS tariff_version_read_policy ON public.tariff_version;
    CREATE POLICY tariff_version_read_policy ON public.tariff_version FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
        AND tariff_grid_id IN (
          SELECT id FROM public.tariff_grid
          WHERE admin_region_id = get_my_admin_region_id()
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'shop'
        AND EXISTS (
          SELECT 1
          FROM public.shop s
          WHERE s.id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
            ''
          )::uuid
            AND s.tariff_version_id = public.tariff_version.id
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'city'
        AND EXISTS (
          SELECT 1
          FROM public.shop s
          WHERE s.city_id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
            ''
          )::uuid
            AND s.tariff_version_id = public.tariff_version.id
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'hq'
        AND EXISTS (
          SELECT 1
          FROM public.shop s
          WHERE s.hq_id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
            ''
          )::uuid
            AND s.tariff_version_id = public.tariff_version.id
        )
      )
    );
  END IF;
END $$;
