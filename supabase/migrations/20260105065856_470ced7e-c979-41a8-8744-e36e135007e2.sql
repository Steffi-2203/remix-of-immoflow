-- Tabelle für Bank-Verbindungen (später für API)
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  iban TEXT,
  bank_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Erweitere transactions Tabelle um fehlende Spalten
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS matched_by UUID,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Tabelle für Soll-Mieten (was erwartet wird)
CREATE TABLE public.rent_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  monthly_rent DECIMAL(10,2) NOT NULL,
  due_day INTEGER DEFAULT 1, -- Tag im Monat wo Miete fällig ist
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_transactions_property ON public.transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON public.transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_rent_expectations_unit ON public.rent_expectations(unit_id);
CREATE INDEX IF NOT EXISTS idx_rent_expectations_org ON public.rent_expectations(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org ON public.bank_accounts(organization_id);

-- RLS für bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank accounts in their org"
  ON public.bank_accounts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert bank accounts in their org"
  ON public.bank_accounts FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update bank accounts in their org"
  ON public.bank_accounts FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete bank accounts in their org"
  ON public.bank_accounts FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS für rent_expectations
ALTER TABLE public.rent_expectations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rent expectations in their org"
  ON public.rent_expectations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert rent expectations in their org"
  ON public.rent_expectations FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update rent expectations in their org"
  ON public.rent_expectations FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete rent expectations in their org"
  ON public.rent_expectations FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Trigger für updated_at
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rent_expectations_updated_at
  BEFORE UPDATE ON public.rent_expectations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();