
-- P2-8a: Fine-grained RBAC permissions

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role public.app_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, resource, action)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE POLICY "Authenticated users can read permissions"
  ON public.permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Org-specific overrides
CREATE TABLE IF NOT EXISTS public.role_permissions_override (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, role, resource, action)
);

ALTER TABLE public.role_permissions_override ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permission overrides"
  ON public.role_permissions_override FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE POLICY "Org members can read overrides"
  ON public.role_permissions_override FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Seed default permissions for all roles
INSERT INTO public.permissions (role, resource, action) VALUES
  -- admin: full access
  ('admin', 'properties', 'read'), ('admin', 'properties', 'write'), ('admin', 'properties', 'delete'),
  ('admin', 'tenants', 'read'), ('admin', 'tenants', 'write'), ('admin', 'tenants', 'delete'),
  ('admin', 'invoices', 'read'), ('admin', 'invoices', 'write'), ('admin', 'invoices', 'delete'), ('admin', 'invoices', 'approve'),
  ('admin', 'settlements', 'read'), ('admin', 'settlements', 'write'), ('admin', 'settlements', 'approve'),
  ('admin', 'billing_runs', 'read'), ('admin', 'billing_runs', 'write'),
  ('admin', 'expenses', 'read'), ('admin', 'expenses', 'write'), ('admin', 'expenses', 'delete'),
  ('admin', 'payments', 'read'), ('admin', 'payments', 'write'),
  ('admin', 'users', 'read'), ('admin', 'users', 'write'), ('admin', 'users', 'delete'),
  -- property_manager
  ('property_manager', 'properties', 'read'), ('property_manager', 'properties', 'write'),
  ('property_manager', 'tenants', 'read'), ('property_manager', 'tenants', 'write'),
  ('property_manager', 'invoices', 'read'), ('property_manager', 'invoices', 'write'),
  ('property_manager', 'settlements', 'read'), ('property_manager', 'settlements', 'write'),
  ('property_manager', 'billing_runs', 'read'), ('property_manager', 'billing_runs', 'write'),
  ('property_manager', 'expenses', 'read'), ('property_manager', 'expenses', 'write'),
  ('property_manager', 'payments', 'read'), ('property_manager', 'payments', 'write'),
  -- finance
  ('finance', 'invoices', 'read'), ('finance', 'invoices', 'write'), ('finance', 'invoices', 'approve'),
  ('finance', 'settlements', 'read'), ('finance', 'settlements', 'write'), ('finance', 'settlements', 'approve'),
  ('finance', 'billing_runs', 'read'), ('finance', 'billing_runs', 'write'),
  ('finance', 'expenses', 'read'), ('finance', 'expenses', 'write'),
  ('finance', 'payments', 'read'), ('finance', 'payments', 'write'),
  ('finance', 'properties', 'read'), ('finance', 'tenants', 'read'),
  -- viewer
  ('viewer', 'properties', 'read'), ('viewer', 'tenants', 'read'), ('viewer', 'invoices', 'read'),
  ('viewer', 'settlements', 'read'), ('viewer', 'expenses', 'read'), ('viewer', 'payments', 'read'),
  ('viewer', 'billing_runs', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;
