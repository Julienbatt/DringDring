-- Allow admin_region/super_admin to manage HQ records

DO $$
BEGIN
  IF to_regclass('public.hq') IS NOT NULL THEN
    ALTER TABLE public.hq ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS hq_manage_policy ON public.hq;
    CREATE POLICY hq_manage_policy ON public.hq
      FOR ALL
      USING (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
          IN ('super_admin', 'admin_region')
      )
      WITH CHECK (
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
          IN ('super_admin', 'admin_region')
      );
  END IF;
END $$;
