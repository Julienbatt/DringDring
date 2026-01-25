-- RLS: allow shop/courier access to deliveries and related tables

DO $$
BEGIN
  IF to_regclass('public.delivery') IS NOT NULL THEN
    ALTER TABLE public.delivery ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS delivery_shop_select_policy ON public.delivery;
    CREATE POLICY delivery_shop_select_policy ON public.delivery
      FOR SELECT
      USING (
        COALESCE(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
          current_setting('request.jwt.claims', true)::jsonb ->> 'role'
        ) = 'shop'
        AND shop_id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
          ''
        )::uuid
      );

    DROP POLICY IF EXISTS delivery_city_select_policy ON public.delivery;
    CREATE POLICY delivery_city_select_policy ON public.delivery
      FOR SELECT
      USING (
        COALESCE(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
          current_setting('request.jwt.claims', true)::jsonb ->> 'role'
        ) = 'city'
        AND city_id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
          ''
        )::uuid
      );

    DROP POLICY IF EXISTS delivery_hq_select_policy ON public.delivery;
    CREATE POLICY delivery_hq_select_policy ON public.delivery
      FOR SELECT
      USING (
        COALESCE(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
          current_setting('request.jwt.claims', true)::jsonb ->> 'role'
        ) = 'hq'
        AND hq_id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
          ''
        )::uuid
      );

    DROP POLICY IF EXISTS delivery_courier_select_policy ON public.delivery;
    CREATE POLICY delivery_courier_select_policy ON public.delivery
      FOR SELECT
      USING (
        COALESCE(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
          current_setting('request.jwt.claims', true)::jsonb ->> 'role'
        ) = 'courier'
        AND courier_id = (
          SELECT id
          FROM public.courier
          WHERE user_id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
            ''
          )::uuid
             OR (email IS NOT NULL AND lower(email) = lower(NULLIF(
              current_setting('request.jwt.claims', true)::jsonb ->> 'email',
              ''
            )))
          LIMIT 1
        )
      );

    DROP POLICY IF EXISTS delivery_shop_insert_policy ON public.delivery;
    CREATE POLICY delivery_shop_insert_policy ON public.delivery
      FOR INSERT
      WITH CHECK (
        COALESCE(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
          current_setting('request.jwt.claims', true)::jsonb ->> 'role'
        ) = 'shop'
        AND shop_id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
          ''
        )::uuid
      );
  END IF;

  IF to_regclass('public.delivery_logistics') IS NOT NULL THEN
    ALTER TABLE public.delivery_logistics ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS delivery_logistics_select_policy ON public.delivery_logistics;
    CREATE POLICY delivery_logistics_select_policy ON public.delivery_logistics
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.delivery d
          WHERE d.id = delivery_logistics.delivery_id
            AND (
              (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'shop'
                AND d.shop_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'admin_region'
                AND d.admin_region_id = get_my_admin_region_id()
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'city'
                AND d.city_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'hq'
                AND d.hq_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'courier'
                AND d.courier_id = (
                  SELECT id
                  FROM public.courier
                  WHERE user_id = NULLIF(
                    current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
                    ''
                  )::uuid
                     OR (email IS NOT NULL AND lower(email) = lower(NULLIF(
                      current_setting('request.jwt.claims', true)::jsonb ->> 'email',
                      ''
                    )))
                  LIMIT 1
                )
              )
            )
        )
      );

    DROP POLICY IF EXISTS delivery_logistics_shop_insert_policy ON public.delivery_logistics;
    CREATE POLICY delivery_logistics_shop_insert_policy ON public.delivery_logistics
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.delivery d
          WHERE d.id = delivery_logistics.delivery_id
            AND COALESCE(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
              current_setting('request.jwt.claims', true)::jsonb ->> 'role'
            ) = 'shop'
            AND d.shop_id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
              ''
            )::uuid
        )
      );
  END IF;

  IF to_regclass('public.delivery_financial') IS NOT NULL THEN
    ALTER TABLE public.delivery_financial ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS delivery_financial_select_policy ON public.delivery_financial;
    CREATE POLICY delivery_financial_select_policy ON public.delivery_financial
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.delivery d
          WHERE d.id = delivery_financial.delivery_id
            AND (
              (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'shop'
                AND d.shop_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'admin_region'
                AND d.admin_region_id = get_my_admin_region_id()
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'city'
                AND d.city_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'hq'
                AND d.hq_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'courier'
                AND d.courier_id = (
                  SELECT id
                  FROM public.courier
                  WHERE user_id = NULLIF(
                    current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
                    ''
                  )::uuid
                     OR (email IS NOT NULL AND lower(email) = lower(NULLIF(
                      current_setting('request.jwt.claims', true)::jsonb ->> 'email',
                      ''
                    )))
                  LIMIT 1
                )
              )
            )
        )
      );

    DROP POLICY IF EXISTS delivery_financial_shop_insert_policy ON public.delivery_financial;
    CREATE POLICY delivery_financial_shop_insert_policy ON public.delivery_financial
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.delivery d
          WHERE d.id = delivery_financial.delivery_id
            AND COALESCE(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
              current_setting('request.jwt.claims', true)::jsonb ->> 'role'
            ) = 'shop'
            AND d.shop_id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
              ''
            )::uuid
        )
      );
  END IF;

  IF to_regclass('public.delivery_status') IS NOT NULL THEN
    ALTER TABLE public.delivery_status ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS delivery_status_select_policy ON public.delivery_status;
    CREATE POLICY delivery_status_select_policy ON public.delivery_status
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.delivery d
          WHERE d.id = delivery_status.delivery_id
            AND (
              (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'shop'
                AND d.shop_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'admin_region'
                AND d.admin_region_id = get_my_admin_region_id()
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'city'
                AND d.city_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'hq'
                AND d.hq_id = NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hq_id',
                  ''
                )::uuid
              )
              OR (
                COALESCE(
                  current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
                  current_setting('request.jwt.claims', true)::jsonb ->> 'role'
                ) = 'courier'
                AND d.courier_id = (
                  SELECT id
                  FROM public.courier
                  WHERE user_id = NULLIF(
                    current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
                    ''
                  )::uuid
                     OR (email IS NOT NULL AND lower(email) = lower(NULLIF(
                      current_setting('request.jwt.claims', true)::jsonb ->> 'email',
                      ''
                    )))
                  LIMIT 1
                )
              )
            )
        )
      );

    DROP POLICY IF EXISTS delivery_status_shop_insert_policy ON public.delivery_status;
    CREATE POLICY delivery_status_shop_insert_policy ON public.delivery_status
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.delivery d
          WHERE d.id = delivery_status.delivery_id
            AND COALESCE(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
              current_setting('request.jwt.claims', true)::jsonb ->> 'role'
            ) = 'shop'
            AND d.shop_id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
              ''
            )::uuid
        )
      );

    DROP POLICY IF EXISTS delivery_status_courier_insert_policy ON public.delivery_status;
    CREATE POLICY delivery_status_courier_insert_policy ON public.delivery_status
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.delivery d
          WHERE d.id = delivery_status.delivery_id
            AND COALESCE(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
              current_setting('request.jwt.claims', true)::jsonb ->> 'role'
            ) = 'courier'
            AND d.courier_id = (
              SELECT id
              FROM public.courier
              WHERE user_id = NULLIF(
                current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
                ''
              )::uuid
                 OR (email IS NOT NULL AND lower(email) = lower(NULLIF(
                  current_setting('request.jwt.claims', true)::jsonb ->> 'email',
                  ''
                )))
              LIMIT 1
            )
        )
      );
  END IF;
END $$;
