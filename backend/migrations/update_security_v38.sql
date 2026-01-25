-- Enable RLS + policies for city_postal_code

ALTER TABLE public.city_postal_code ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS city_postal_code_read_policy ON public.city_postal_code;
CREATE POLICY city_postal_code_read_policy ON public.city_postal_code
  FOR SELECT
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    OR (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
      AND EXISTS (
        SELECT 1
        FROM public.city c
        WHERE c.id = public.city_postal_code.city_id
          AND c.admin_region_id = get_my_admin_region_id()
      )
    )
    OR (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'city'
      AND public.city_postal_code.city_id = NULLIF(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
        ''
      )::uuid
    )
  );

DROP POLICY IF EXISTS city_postal_code_manage_policy ON public.city_postal_code;
CREATE POLICY city_postal_code_manage_policy ON public.city_postal_code
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    OR (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
      AND EXISTS (
        SELECT 1
        FROM public.city c
        WHERE c.id = public.city_postal_code.city_id
          AND c.admin_region_id = get_my_admin_region_id()
      )
    )
    OR (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'city'
      AND public.city_postal_code.city_id = NULLIF(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
        ''
      )::uuid
    )
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
    OR (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'admin_region'
      AND EXISTS (
        SELECT 1
        FROM public.city c
        WHERE c.id = public.city_postal_code.city_id
          AND c.admin_region_id = get_my_admin_region_id()
      )
    )
    OR (
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'city'
      AND public.city_postal_code.city_id = NULLIF(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'city_id',
        ''
      )::uuid
    )
  );
