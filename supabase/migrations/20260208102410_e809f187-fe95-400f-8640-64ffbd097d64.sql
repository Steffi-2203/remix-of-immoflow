
-- =============================================
-- P2-9a: Multi-Tenant RLS Hardening
-- =============================================

-- Helper: get organization_id for current auth user
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Helper: check if property belongs to user's org (via property_managers or org)
CREATE OR REPLACE FUNCTION public.owns_property(_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties p
    JOIN public.profiles pr ON pr.organization_id IS NOT NULL
    JOIN public.property_managers pm ON pm.property_id = p.id AND pm.user_id = pr.id
    WHERE p.id = _property_id AND pr.id = auth.uid()
  ) OR EXISTS (
    -- Admin sees all properties in org (unassigned ones)
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
$$;

-- Helper: check if tenant belongs to user's org via unit chain
CREATE OR REPLACE FUNCTION public.owns_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON u.id = t.unit_id
    JOIN public.properties p ON p.id = u.property_id
    WHERE t.id = _tenant_id
    AND (
      public.is_property_manager(auth.uid(), p.id)
      OR public.is_admin(auth.uid())
    )
  )
$$;

-- 1. invoice_lines: restrict from public to authenticated + org check
DROP POLICY IF EXISTS "Users can insert invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can update invoice lines" ON public.invoice_lines;

CREATE POLICY "Org members can insert invoice lines"
ON public.invoice_lines FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.monthly_invoices mi
    WHERE mi.id = invoice_id
    AND public.owns_tenant(mi.tenant_id)
  )
);

CREATE POLICY "Org members can update invoice lines"
ON public.invoice_lines FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.monthly_invoices mi
    WHERE mi.id = invoice_id
    AND public.owns_tenant(mi.tenant_id)
  )
);

-- 2. property_budgets: scope to organization
DROP POLICY IF EXISTS "Users can insert budgets" ON public.property_budgets;
DROP POLICY IF EXISTS "Users can update budgets" ON public.property_budgets;
DROP POLICY IF EXISTS "Users can delete budgets" ON public.property_budgets;

CREATE POLICY "Org members can insert budgets"
ON public.property_budgets FOR INSERT TO authenticated
WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Org members can update budgets"
ON public.property_budgets FOR UPDATE TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Org members can delete budgets"
ON public.property_budgets FOR DELETE TO authenticated
USING (organization_id = public.user_org_id());

-- 3. rent_adjustments: scope via tenant ownership
DROP POLICY IF EXISTS "Authenticated users can manage rent adjustments" ON public.rent_adjustments;

CREATE POLICY "Org members can read rent adjustments"
ON public.rent_adjustments FOR SELECT TO authenticated
USING (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can insert rent adjustments"
ON public.rent_adjustments FOR INSERT TO authenticated
WITH CHECK (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can update rent adjustments"
ON public.rent_adjustments FOR UPDATE TO authenticated
USING (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can delete rent adjustments"
ON public.rent_adjustments FOR DELETE TO authenticated
USING (public.owns_tenant(tenant_id));

-- 4. rent_index_clauses: scope via tenant ownership
DROP POLICY IF EXISTS "Authenticated users can manage rent index clauses" ON public.rent_index_clauses;

CREATE POLICY "Org members can read rent index clauses"
ON public.rent_index_clauses FOR SELECT TO authenticated
USING (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can insert rent index clauses"
ON public.rent_index_clauses FOR INSERT TO authenticated
WITH CHECK (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can update rent index clauses"
ON public.rent_index_clauses FOR UPDATE TO authenticated
USING (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can delete rent index clauses"
ON public.rent_index_clauses FOR DELETE TO authenticated
USING (public.owns_tenant(tenant_id));

-- 5. tenant_deposits: scope via tenant ownership
DROP POLICY IF EXISTS "Authenticated users can manage tenant deposits" ON public.tenant_deposits;

CREATE POLICY "Org members can read tenant deposits"
ON public.tenant_deposits FOR SELECT TO authenticated
USING (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can insert tenant deposits"
ON public.tenant_deposits FOR INSERT TO authenticated
WITH CHECK (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can update tenant deposits"
ON public.tenant_deposits FOR UPDATE TO authenticated
USING (public.owns_tenant(tenant_id));

CREATE POLICY "Org members can delete tenant deposits"
ON public.tenant_deposits FOR DELETE TO authenticated
USING (public.owns_tenant(tenant_id));

-- =============================================
-- P2-9b: Job Queue Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  retry_count integer NOT NULL DEFAULT 0,
  error text,
  result jsonb,
  created_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_queue_status_scheduled ON public.job_queue (status, scheduled_for) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_job_queue_org ON public.job_queue (organization_id);
CREATE INDEX idx_job_queue_type ON public.job_queue (job_type);

ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their jobs"
ON public.job_queue FOR SELECT TO authenticated
USING (organization_id = public.user_org_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Org members can create jobs"
ON public.job_queue FOR INSERT TO authenticated
WITH CHECK (organization_id = public.user_org_id());

-- =============================================
-- P2-9c: SSO Provider Configuration Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.sso_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
  display_name text NOT NULL,
  issuer_url text,
  metadata_url text,
  client_id text,
  -- Encrypted client secret stored in vault, reference only
  client_secret_vault_id text,
  certificate text,
  attribute_mapping jsonb NOT NULL DEFAULT '{"email": "email", "name": "name"}',
  is_active boolean NOT NULL DEFAULT false,
  enforce_sso boolean NOT NULL DEFAULT false,
  allowed_domains text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider_type)
);

ALTER TABLE public.sso_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SSO providers"
ON public.sso_providers FOR ALL TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));
