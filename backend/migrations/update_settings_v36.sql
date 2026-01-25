-- App settings: VAT rate per effective month

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT NOT NULL,
  value_numeric NUMERIC(8,4),
  effective_from DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key, effective_from)
);

INSERT INTO public.app_settings (key, value_numeric, effective_from)
SELECT 'vat_rate', 0.081, date_trunc('month', now())::date
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_settings WHERE key = 'vat_rate'
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_read_policy ON public.app_settings;
CREATE POLICY app_settings_read_policy ON public.app_settings
  FOR SELECT
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region', 'hq', 'city', 'shop', 'customer')
  );

DROP POLICY IF EXISTS app_settings_manage_policy ON public.app_settings;
CREATE POLICY app_settings_manage_policy ON public.app_settings
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role' = 'super_admin'
  );
