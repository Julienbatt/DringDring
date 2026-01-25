-- Allow admin_region users to update their own admin_region row
DO $$
BEGIN
  IF to_regclass('public.admin_region') IS NOT NULL THEN
    ALTER TABLE public.admin_region ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS admin_region_update_policy ON public.admin_region;
    CREATE POLICY admin_region_update_policy ON public.admin_region
      FOR UPDATE
      USING (
        (
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
          AND id = get_my_admin_region_id()
        )
        OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
      )
      WITH CHECK (
        (
          current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
          AND id = get_my_admin_region_id()
        )
        OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
      );
  END IF;
END $$;
