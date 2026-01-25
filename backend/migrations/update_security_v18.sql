-- Security: customer visibility for client, delivery, logistics, status

DO $$
BEGIN
  IF to_regclass('public.client') IS NOT NULL THEN
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
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'customer'
        AND id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'client_id',
          ''
        )::uuid
      )
    );
  END IF;

  IF to_regclass('public.delivery') IS NOT NULL THEN
    DROP POLICY IF EXISTS customer_delivery_policy ON public.delivery;
    CREATE POLICY customer_delivery_policy ON public.delivery FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'customer'
      AND client_id = NULLIF(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'client_id',
        ''
      )::uuid
    );
  END IF;

  IF to_regclass('public.delivery_logistics') IS NOT NULL THEN
    DROP POLICY IF EXISTS customer_delivery_logistics_policy ON public.delivery_logistics;
    CREATE POLICY customer_delivery_logistics_policy ON public.delivery_logistics FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'customer'
      AND delivery_id IN (
        SELECT id FROM public.delivery
        WHERE client_id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'client_id',
          ''
        )::uuid
      )
    );
  END IF;

  IF to_regclass('public.delivery_status') IS NOT NULL THEN
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
      OR (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'customer'
        AND EXISTS (
          SELECT 1 FROM public.delivery d
          WHERE d.id = public.delivery_status.delivery_id
            AND d.client_id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'client_id',
              ''
            )::uuid
        )
      )
    );
  END IF;
END $$;
