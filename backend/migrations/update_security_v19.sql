-- Security: allow customers to update their own client profile

DO $$
BEGIN
  IF to_regclass('public.client') IS NOT NULL THEN
    DROP POLICY IF EXISTS client_update_self_policy ON public.client;
    CREATE POLICY client_update_self_policy ON public.client
      FOR UPDATE
      USING (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'customer'
        AND id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'client_id',
          ''
        )::uuid
      )
      WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'customer'
        AND id = NULLIF(
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'client_id',
          ''
        )::uuid
      );
  END IF;
END $$;
