
-- Feature 13: Tenant Portal Access
CREATE TABLE public.tenant_portal_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id),
  UNIQUE(email)
);

ALTER TABLE public.tenant_portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own portal access"
  ON public.tenant_portal_access FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage portal access"
  ON public.tenant_portal_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid() AND ur.role IN ('admin', 'finance')
    )
  );

-- Feature 14: Serial Letter Templates
CREATE TABLE public.letter_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'allgemein',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage templates"
  ON public.letter_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE TABLE public.serial_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID REFERENCES public.properties(id),
  template_id UUID REFERENCES public.letter_templates(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_via TEXT NOT NULL DEFAULT 'pdf',
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.serial_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage serial letters"
  ON public.serial_letters FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Feature 15: Management Contracts (no owner FK since owners table doesn't exist)
CREATE TABLE public.management_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID REFERENCES public.properties(id),
  owner_name TEXT,
  contract_type TEXT NOT NULL DEFAULT 'hausverwaltung',
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  renewal_months INTEGER DEFAULT 12,
  notice_period_months INTEGER DEFAULT 3,
  notice_deadline TEXT,
  monthly_fee NUMERIC(10,2),
  fee_type TEXT DEFAULT 'pro_einheit',
  notes TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'aktiv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.management_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage contracts"
  ON public.management_contracts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Triggers
CREATE TRIGGER update_tenant_portal_access_updated_at
  BEFORE UPDATE ON public.tenant_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_letter_templates_updated_at
  BEFORE UPDATE ON public.letter_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_management_contracts_updated_at
  BEFORE UPDATE ON public.management_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
