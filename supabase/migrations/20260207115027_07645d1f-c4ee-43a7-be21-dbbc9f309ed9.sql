
-- WEG Business Plans
CREATE TABLE public.weg_business_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'beschlossen', 'aktiv')),
  effective_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_in_assembly_id UUID REFERENCES public.weg_assemblies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weg_business_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org weg business plans" ON public.weg_business_plans FOR SELECT USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert own org weg business plans" ON public.weg_business_plans FOR INSERT WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update own org weg business plans" ON public.weg_business_plans FOR UPDATE USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete own org weg business plans" ON public.weg_business_plans FOR DELETE USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()));

-- WEG Business Plan Items
CREATE TABLE public.weg_business_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_plan_id UUID NOT NULL REFERENCES public.weg_business_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'sonstiges' CHECK (category IN ('betriebskosten', 'verwaltung', 'ruecklage', 'heizung', 'wasser', 'sonstiges')),
  description TEXT NOT NULL,
  annual_amount NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0 CHECK (tax_rate IN (0, 10, 20)),
  distribution_key TEXT NOT NULL DEFAULT 'mea' CHECK (distribution_key IN ('mea', 'qm', 'personen', 'gleich')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weg_business_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weg plan items via plan" ON public.weg_business_plan_items FOR SELECT USING (business_plan_id IN (SELECT id FROM weg_business_plans WHERE organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())));
CREATE POLICY "Users can insert weg plan items via plan" ON public.weg_business_plan_items FOR INSERT WITH CHECK (business_plan_id IN (SELECT id FROM weg_business_plans WHERE organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())));
CREATE POLICY "Users can update weg plan items via plan" ON public.weg_business_plan_items FOR UPDATE USING (business_plan_id IN (SELECT id FROM weg_business_plans WHERE organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())));
CREATE POLICY "Users can delete weg plan items via plan" ON public.weg_business_plan_items FOR DELETE USING (business_plan_id IN (SELECT id FROM weg_business_plans WHERE organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())));

-- WEG Owner Invoices
CREATE TABLE public.weg_owner_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_plan_id UUID NOT NULL REFERENCES public.weg_business_plans(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.property_owners(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount_net NUMERIC NOT NULL DEFAULT 0,
  amount_tax NUMERIC NOT NULL DEFAULT 0,
  amount_gross NUMERIC NOT NULL DEFAULT 0,
  reserve_contribution NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'bezahlt', 'teilbezahlt', 'ueberfaellig', 'storniert')),
  due_date DATE NOT NULL,
  is_prorated BOOLEAN NOT NULL DEFAULT false,
  prorated_days INTEGER,
  total_days INTEGER,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weg_owner_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weg owner invoices via plan" ON public.weg_owner_invoices FOR SELECT USING (business_plan_id IN (SELECT id FROM weg_business_plans WHERE organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())));
CREATE POLICY "Users can insert weg owner invoices via plan" ON public.weg_owner_invoices FOR INSERT WITH CHECK (business_plan_id IN (SELECT id FROM weg_business_plans WHERE organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())));
CREATE POLICY "Users can update weg owner invoices via plan" ON public.weg_owner_invoices FOR UPDATE USING (business_plan_id IN (SELECT id FROM weg_business_plans WHERE organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())));
CREATE POLICY "Users can delete weg owner invoices via plan" ON public.weg_owner_invoices FOR DELETE USING (business_plan_id IN (SELECT id FROM weg_business_plans WHERE organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())));

-- WEG Ownership Transfers
CREATE TABLE public.weg_ownership_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id),
  old_owner_id UUID NOT NULL REFERENCES public.property_owners(id),
  new_owner_id UUID REFERENCES public.property_owners(id),
  transfer_date DATE NOT NULL,
  land_registry_date DATE,
  land_registry_ref TEXT,
  legal_reason TEXT NOT NULL DEFAULT 'kauf' CHECK (legal_reason IN ('kauf', 'schenkung', 'erbschaft', 'zwangsversteigerung', 'einbringung')),
  status TEXT NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'grundbuch_eingetragen', 'abgeschlossen')),
  outstanding_amount NUMERIC NOT NULL DEFAULT 0,
  reserve_balance_transferred NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.weg_ownership_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org weg transfers" ON public.weg_ownership_transfers FOR SELECT USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert own org weg transfers" ON public.weg_ownership_transfers FOR INSERT WITH CHECK (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update own org weg transfers" ON public.weg_ownership_transfers FOR UPDATE USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete own org weg transfers" ON public.weg_ownership_transfers FOR DELETE USING (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid()));

-- Trigger for updated_at on business plans
CREATE TRIGGER update_weg_business_plans_updated_at
  BEFORE UPDATE ON public.weg_business_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
