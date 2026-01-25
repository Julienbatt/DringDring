-- Security hardening: RLS for client + delivery_status, lock function search_path

DO $$
BEGIN
  IF to_regclass('public.client') IS NOT NULL THEN
    ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_client ON public.client;
    CREATE POLICY service_role_bypass_client ON public.client USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS client_read_policy ON public.client;
    CREATE POLICY client_read_policy ON public.client FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' IN ('admin_region', 'shop')
        AND city_id IN (
          SELECT id FROM public.city
          WHERE admin_region_id = get_my_admin_region_id()
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'city'
        AND city_id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
          ''
        )::uuid
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'hq'
        AND city_id IN (
          SELECT c.id
          FROM public.shop s
          JOIN public.city c ON c.id = s.city_id
          WHERE s.hq_id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
            ''
          )::uuid
        )
      )
    );

    DROP POLICY IF EXISTS client_manage_policy ON public.client;
    CREATE POLICY client_manage_policy ON public.client
      FOR ALL
      USING (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
        OR (
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
          AND city_id IN (
            SELECT id FROM public.city
            WHERE admin_region_id = get_my_admin_region_id()
          )
        )
      )
      WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
        OR (
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
          AND city_id IN (
            SELECT id FROM public.city
            WHERE admin_region_id = get_my_admin_region_id()
          )
        )
      );
  END IF;

  IF to_regclass('public.delivery_status') IS NOT NULL THEN
    ALTER TABLE public.delivery_status ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_delivery_status ON public.delivery_status;
    CREATE POLICY service_role_bypass_delivery_status ON public.delivery_status USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS delivery_status_read_policy ON public.delivery_status;
    CREATE POLICY delivery_status_read_policy ON public.delivery_status FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
        AND EXISTS (
          SELECT 1 FROM public.delivery d
          WHERE d.id = public.delivery_status.delivery_id
            AND d.admin_region_id = get_my_admin_region_id()
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'shop'
        AND EXISTS (
          SELECT 1 FROM public.delivery d
          WHERE d.id = public.delivery_status.delivery_id
            AND d.shop_id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
              ''
            )::uuid
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'city'
        AND EXISTS (
          SELECT 1 FROM public.delivery d
          WHERE d.id = public.delivery_status.delivery_id
            AND d.city_id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
              ''
            )::uuid
        )
      )
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'hq'
        AND EXISTS (
          SELECT 1 FROM public.delivery d
          WHERE d.id = public.delivery_status.delivery_id
            AND d.hq_id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
              ''
            )::uuid
        )
      )
    );
  END IF;

  IF to_regprocedure('public.get_my_admin_region_id()') IS NOT NULL THEN
    ALTER FUNCTION public.get_my_admin_region_id() SET search_path = public;
  END IF;

  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;
END $$;
