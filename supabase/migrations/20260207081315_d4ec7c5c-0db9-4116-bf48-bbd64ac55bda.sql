
-- Feature 10: WEG-Verwaltung
CREATE TABLE public.weg_assemblies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assembly_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  protocol_url TEXT,
  status TEXT NOT NULL DEFAULT 'geplant' CHECK (status IN ('geplant', 'durchgefuehrt', 'protokolliert')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weg_assemblies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org weg assemblies"
  ON public.weg_assemblies FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org weg assemblies"
  ON public.weg_assemblies FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org weg assemblies"
  ON public.weg_assemblies FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org weg assemblies"
  ON public.weg_assemblies FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_weg_assemblies_updated_at
  BEFORE UPDATE ON public.weg_assemblies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WEG Abstimmungen (Voting items per assembly)
CREATE TABLE public.weg_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assembly_id UUID NOT NULL REFERENCES public.weg_assemblies(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT,
  votes_yes INTEGER NOT NULL DEFAULT 0,
  votes_no INTEGER NOT NULL DEFAULT 0,
  votes_abstain INTEGER NOT NULL DEFAULT 0,
  result TEXT CHECK (result IN ('angenommen', 'abgelehnt', 'vertagt', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weg_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weg votes via assembly"
  ON public.weg_votes FOR SELECT
  USING (assembly_id IN (SELECT id FROM public.weg_assemblies WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert weg votes"
  ON public.weg_votes FOR INSERT
  WITH CHECK (assembly_id IN (SELECT id FROM public.weg_assemblies WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update weg votes"
  ON public.weg_votes FOR UPDATE
  USING (assembly_id IN (SELECT id FROM public.weg_assemblies WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete weg votes"
  ON public.weg_votes FOR DELETE
  USING (assembly_id IN (SELECT id FROM public.weg_assemblies WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Instandhaltungsrücklage
CREATE TABLE public.weg_reserve_fund (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  entry_type TEXT NOT NULL DEFAULT 'einzahlung' CHECK (entry_type IN ('einzahlung', 'entnahme')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weg_reserve_fund ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org reserve fund"
  ON public.weg_reserve_fund FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org reserve fund"
  ON public.weg_reserve_fund FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org reserve fund"
  ON public.weg_reserve_fund FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org reserve fund"
  ON public.weg_reserve_fund FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Feature 11: Versicherungsverwaltung
CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  insurance_type TEXT NOT NULL DEFAULT 'gebaeudeversicherung',
  provider TEXT NOT NULL,
  policy_number TEXT,
  coverage_amount NUMERIC(12,2),
  annual_premium NUMERIC(12,2),
  start_date DATE NOT NULL,
  end_date DATE,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org insurance policies"
  ON public.insurance_policies FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org insurance policies"
  ON public.insurance_policies FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org insurance policies"
  ON public.insurance_policies FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org insurance policies"
  ON public.insurance_policies FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_insurance_policies_updated_at
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Schadensmeldungen
CREATE TABLE public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  insurance_policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  unit_id UUID REFERENCES public.units(id),
  claim_date DATE NOT NULL,
  description TEXT NOT NULL,
  damage_amount NUMERIC(12,2),
  reimbursed_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'gemeldet' CHECK (status IN ('gemeldet', 'in_bearbeitung', 'genehmigt', 'abgelehnt', 'erledigt')),
  claim_number TEXT,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org insurance claims"
  ON public.insurance_claims FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org insurance claims"
  ON public.insurance_claims FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org insurance claims"
  ON public.insurance_claims FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org insurance claims"
  ON public.insurance_claims FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Feature 12: Termin-/Fristenkalender (deadlines)
CREATE TABLE public.deadlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline_date DATE NOT NULL,
  reminder_days INTEGER NOT NULL DEFAULT 14,
  reminder_sent_at TIMESTAMPTZ,
  category TEXT NOT NULL DEFAULT 'sonstiges' CHECK (category IN ('vertrag', 'versicherung', 'wartung', 'abrechnung', 'steuer', 'sonstiges')),
  source_type TEXT, -- e.g. 'insurance_policy', 'maintenance_contract', 'tenant'
  source_id UUID,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_months INTEGER,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt', 'uebersprungen')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org deadlines"
  ON public.deadlines FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org deadlines"
  ON public.deadlines FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own org deadlines"
  ON public.deadlines FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own org deadlines"
  ON public.deadlines FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_deadlines_updated_at
  BEFORE UPDATE ON public.deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
