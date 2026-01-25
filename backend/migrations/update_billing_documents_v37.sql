-- Billing documents: payor-centric invoices

CREATE TABLE IF NOT EXISTS public.billing_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_region_id UUID NOT NULL REFERENCES public.admin_region(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE (admin_region_id, period_month)
);

CREATE TABLE IF NOT EXISTS public.billing_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.billing_run(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL,
  recipient_id UUID NOT NULL,
  period_month DATE NOT NULL,
  amount_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE (recipient_type, recipient_id, period_month)
);

CREATE TABLE IF NOT EXISTS public.billing_document_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.billing_document(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shop(id),
  delivery_id UUID REFERENCES public.delivery(id),
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_run_admin_period
  ON public.billing_run (admin_region_id, period_month);

CREATE INDEX IF NOT EXISTS idx_billing_document_recipient
  ON public.billing_document (recipient_type, recipient_id, period_month);

CREATE INDEX IF NOT EXISTS idx_billing_document_line_doc
  ON public.billing_document_line (document_id);

ALTER TABLE public.billing_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_document_line ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_run_read_policy ON public.billing_run;
CREATE POLICY billing_run_read_policy ON public.billing_run
  FOR SELECT
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  );

DROP POLICY IF EXISTS billing_run_manage_policy ON public.billing_run;
CREATE POLICY billing_run_manage_policy ON public.billing_run
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  );

DROP POLICY IF EXISTS billing_document_read_policy ON public.billing_document;
CREATE POLICY billing_document_read_policy ON public.billing_document
  FOR SELECT
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  );

DROP POLICY IF EXISTS billing_document_manage_policy ON public.billing_document;
CREATE POLICY billing_document_manage_policy ON public.billing_document
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  );

DROP POLICY IF EXISTS billing_document_line_read_policy ON public.billing_document_line;
CREATE POLICY billing_document_line_read_policy ON public.billing_document_line
  FOR SELECT
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  );

DROP POLICY IF EXISTS billing_document_line_manage_policy ON public.billing_document_line;
CREATE POLICY billing_document_line_manage_policy ON public.billing_document_line
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'
      IN ('super_admin', 'admin_region')
  );
