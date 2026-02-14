
-- EBICS Banking Connections
CREATE TABLE public.ebics_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  host_id TEXT NOT NULL,
  host_url TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  user_id_ebics TEXT NOT NULL,
  system_id TEXT,
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_init' CHECK (status IN ('pending_init', 'ini_sent', 'hia_sent', 'awaiting_letters', 'active', 'suspended', 'error')),
  key_version TEXT NOT NULL DEFAULT 'A006',
  auth_key_hash TEXT,
  encryption_key_hash TEXT,
  signature_key_hash TEXT,
  keys_initialized_at TIMESTAMPTZ,
  last_download_at TIMESTAMPTZ,
  last_upload_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ebics_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org EBICS connections"
  ON public.ebics_connections FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Admins can manage EBICS connections"
  ON public.ebics_connections FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- EBICS Order Log (every request/response)
CREATE TABLE public.ebics_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.ebics_connections(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL,
  order_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('upload', 'download')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  business_code TEXT,
  technical_code TEXT,
  payload_hash TEXT,
  records_count INT DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ebics_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org EBICS orders"
  ON public.ebics_orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ebics_connections ec
    WHERE ec.id = ebics_orders.connection_id
    AND ec.organization_id = public.user_org_id()
  ));

-- EBICS Payment Batches (outgoing payments via CCT)
CREATE TABLE public.ebics_payment_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.ebics_connections(id),
  organization_id UUID REFERENCES public.organizations(id),
  batch_type TEXT NOT NULL CHECK (batch_type IN ('rent_collection', 'vendor_payment', 'custom')),
  pain_xml TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'submitted', 'accepted', 'rejected', 'partially_accepted')),
  submitted_at TIMESTAMPTZ,
  response_code TEXT,
  response_message TEXT,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ebics_payment_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org EBICS payment batches"
  ON public.ebics_payment_batches FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Admins can manage EBICS payment batches"
  ON public.ebics_payment_batches FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Add chart of accounts entries for EBICS clearing
INSERT INTO public.chart_of_accounts (organization_id, account_number, name, account_type, description, is_system)
SELECT o.id, '2810', 'EBICS Transitkonto', 'asset', 'Durchlaufkonto für EBICS-Zahlungen', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.chart_of_accounts coa
  WHERE coa.organization_id = o.id AND coa.account_number = '2810'
);
