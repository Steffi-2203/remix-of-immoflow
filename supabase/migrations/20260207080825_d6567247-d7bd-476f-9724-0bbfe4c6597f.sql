
-- Feature 7: Heizkosten-Abrechnung separat (external heating cost readings)
CREATE TABLE public.heating_cost_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  consumption NUMERIC(12,4) NOT NULL DEFAULT 0,
  consumption_unit TEXT NOT NULL DEFAULT 'kWh',
  cost_share NUMERIC(12,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('csv', 'manual')),
  provider TEXT, -- e.g. ISTA, Techem
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.heating_cost_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org heating readings"
  ON public.heating_cost_readings FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org heating readings"
  ON public.heating_cost_readings FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org heating readings"
  ON public.heating_cost_readings FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org heating readings"
  ON public.heating_cost_readings FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_heating_cost_readings_updated_at
  BEFORE UPDATE ON public.heating_cost_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feature 8: Distribution key per expense
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS distribution_key_id UUID REFERENCES public.distribution_keys(id);

-- Feature 9: Owner payouts
CREATE TABLE public.owner_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.property_owners(id) ON DELETE CASCADE,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  total_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  management_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payout NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'freigegeben', 'ausgezahlt')),
  pdf_url TEXT,
  sepa_exported_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org owner payouts"
  ON public.owner_payouts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org owner payouts"
  ON public.owner_payouts FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org owner payouts"
  ON public.owner_payouts FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org owner payouts"
  ON public.owner_payouts FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_owner_payouts_updated_at
  BEFORE UPDATE ON public.owner_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
