-- RLS: allow shop to read/insert clients within its admin region

DO $$
BEGIN
  IF to_regclass('public.client') IS NOT NULL THEN
    ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS client_shop_read_policy ON public.client;
    CREATE POLICY client_shop_read_policy ON public.client
      FOR SELECT
      USING (
        COALESCE(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
          current_setting('request.jwt.claims', true)::jsonb ->> 'role'
        ) = 'shop'
        AND city_id IN (
          SELECT c.id
          FROM public.shop s
          JOIN public.city c ON c.id = s.city_id
          WHERE s.id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
            ''
          )::uuid
          AND c.admin_region_id = (
            SELECT c2.admin_region_id
            FROM public.shop s2
            JOIN public.city c2 ON c2.id = s2.city_id
            WHERE s2.id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
              ''
            )::uuid
          )
        )
      );

    DROP POLICY IF EXISTS client_shop_insert_policy ON public.client;
    CREATE POLICY client_shop_insert_policy ON public.client
      FOR INSERT
      WITH CHECK (
        COALESCE(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
          current_setting('request.jwt.claims', true)::jsonb ->> 'role'
        ) = 'shop'
        AND city_id IN (
          SELECT c.id
          FROM public.shop s
          JOIN public.city c ON c.id = s.city_id
          WHERE s.id = NULLIF(
            current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
            ''
          )::uuid
          AND c.admin_region_id = (
            SELECT c2.admin_region_id
            FROM public.shop s2
            JOIN public.city c2 ON c2.id = s2.city_id
            WHERE s2.id = NULLIF(
              current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'shop_id',
              ''
            )::uuid
          )
        )
      );
  END IF;
END $$;
