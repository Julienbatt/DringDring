-- Security hardening: RLS enablement + invoker views

-- Views should run with invoker privileges (not definer)
ALTER VIEW IF EXISTS public.view_city_billing_shops SET (security_invoker = true);
ALTER VIEW IF EXISTS public.view_city_billing SET (security_invoker = true);
ALTER VIEW IF EXISTS public.view_hq_billing_shops SET (security_invoker = true);
ALTER VIEW IF EXISTS public.view_hq_billing SET (security_invoker = true);
ALTER VIEW IF EXISTS public.view_shop_performance SET (security_invoker = true);

-- RLS enablement + policies (guard with existence checks)
DO $$
BEGIN
  IF to_regclass('public.canton') IS NOT NULL THEN
    ALTER TABLE public.canton ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_canton ON public.canton;
    CREATE POLICY service_role_bypass_canton ON public.canton USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS canton_read_policy ON public.canton;
    CREATE POLICY canton_read_policy ON public.canton FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
    );
  END IF;

  IF to_regclass('public.admin_region') IS NOT NULL THEN
    ALTER TABLE public.admin_region ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_admin_region ON public.admin_region;
    CREATE POLICY service_role_bypass_admin_region ON public.admin_region USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS admin_region_read_policy ON public.admin_region;
    CREATE POLICY admin_region_read_policy ON public.admin_region FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
    );
  END IF;

  IF to_regclass('public.hq') IS NOT NULL THEN
    ALTER TABLE public.hq ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_hq ON public.hq;
    CREATE POLICY service_role_bypass_hq ON public.hq USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS hq_read_policy ON public.hq;
    CREATE POLICY hq_read_policy ON public.hq FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
    );
  END IF;

  IF to_regclass('public.tariff_grid') IS NOT NULL THEN
    ALTER TABLE public.tariff_grid ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_tariff_grid ON public.tariff_grid;
    CREATE POLICY service_role_bypass_tariff_grid ON public.tariff_grid USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS tariff_grid_read_policy ON public.tariff_grid;
    CREATE POLICY tariff_grid_read_policy ON public.tariff_grid FOR SELECT USING (
      admin_region_id = get_my_admin_region_id() OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS tariff_grid_manage_policy ON public.tariff_grid;
    CREATE POLICY tariff_grid_manage_policy ON public.tariff_grid
      FOR ALL
      USING (
        admin_region_id = get_my_admin_region_id() OR
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
      )
      WITH CHECK (
        admin_region_id = get_my_admin_region_id() OR
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
      );
  END IF;

  IF to_regclass('public.tariff_version') IS NOT NULL THEN
    ALTER TABLE public.tariff_version ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_tariff_version ON public.tariff_version;
    CREATE POLICY service_role_bypass_tariff_version ON public.tariff_version USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

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

    DROP POLICY IF EXISTS tariff_version_manage_policy ON public.tariff_version;
    IF to_regclass('public.tariff_grid') IS NOT NULL THEN
      CREATE POLICY tariff_version_manage_policy ON public.tariff_version
        FOR ALL
        USING (
          tariff_grid_id IN (
            SELECT id FROM public.tariff_grid
            WHERE admin_region_id = get_my_admin_region_id()
          ) OR
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
        )
        WITH CHECK (
          tariff_grid_id IN (
            SELECT id FROM public.tariff_grid
            WHERE admin_region_id = get_my_admin_region_id()
          ) OR
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
        );
    ELSE
      CREATE POLICY tariff_version_manage_policy ON public.tariff_version
        FOR ALL
        USING (
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
        )
        WITH CHECK (
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
        );
    END IF;
  END IF;

  IF to_regclass('public.tariff') IS NOT NULL THEN
    ALTER TABLE public.tariff ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_tariff ON public.tariff;
    CREATE POLICY service_role_bypass_tariff ON public.tariff USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS tariff_read_policy ON public.tariff;
    CREATE POLICY tariff_read_policy ON public.tariff FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
    );
  END IF;

  IF to_regclass('public.pricing_rule_legacy') IS NOT NULL THEN
    ALTER TABLE public.pricing_rule_legacy ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS service_role_bypass_pricing_rule_legacy ON public.pricing_rule_legacy;
    CREATE POLICY service_role_bypass_pricing_rule_legacy ON public.pricing_rule_legacy USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role' OR
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    );

    DROP POLICY IF EXISTS pricing_rule_legacy_read_policy ON public.pricing_rule_legacy;
    CREATE POLICY pricing_rule_legacy_read_policy ON public.pricing_rule_legacy FOR SELECT USING (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
    );
  END IF;
END $$;
