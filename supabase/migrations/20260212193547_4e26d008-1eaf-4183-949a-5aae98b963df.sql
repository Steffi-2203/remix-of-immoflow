-- ========================================
-- 1. ZÄHLER-/VERBRAUCHSVERWALTUNG
-- ========================================

-- Zähler (Meters)
CREATE TABLE public.meters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  meter_type TEXT NOT NULL CHECK (meter_type IN ('strom', 'wasser', 'gas', 'heizung', 'warmwasser')),
  meter_number TEXT NOT NULL,
  location_description TEXT,
  installation_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meters in their org"
ON public.meters FOR SELECT TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can insert meters in their org"
ON public.meters FOR INSERT TO authenticated
WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Users can update meters in their org"
ON public.meters FOR UPDATE TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can delete meters in their org"
ON public.meters FOR DELETE TO authenticated
USING (organization_id = public.user_org_id());

-- Zählerablesungen (Meter Readings)
CREATE TABLE public.meter_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meter_id UUID REFERENCES public.meters(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  reading_date DATE NOT NULL,
  reading_value NUMERIC(12,3) NOT NULL,
  consumption NUMERIC(12,3),
  unit TEXT NOT NULL DEFAULT 'kWh',
  read_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view readings in their org"
ON public.meter_readings FOR SELECT TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can insert readings in their org"
ON public.meter_readings FOR INSERT TO authenticated
WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Users can update readings in their org"
ON public.meter_readings FOR UPDATE TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can delete readings in their org"
ON public.meter_readings FOR DELETE TO authenticated
USING (organization_id = public.user_org_id());

CREATE INDEX idx_meter_readings_meter ON public.meter_readings(meter_id, reading_date DESC);

-- ========================================
-- 2. MIETERKOMMUNIKATION (Announcements)
-- ========================================

CREATE TABLE public.tenant_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'allgemein' CHECK (category IN ('allgemein', 'wartung', 'wichtig', 'veranstaltung')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view announcements in their org"
ON public.tenant_announcements FOR SELECT TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can insert announcements in their org"
ON public.tenant_announcements FOR INSERT TO authenticated
WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Users can update announcements in their org"
ON public.tenant_announcements FOR UPDATE TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can delete announcements in their org"
ON public.tenant_announcements FOR DELETE TO authenticated
USING (organization_id = public.user_org_id());

CREATE INDEX idx_announcements_property ON public.tenant_announcements(property_id, valid_from DESC);

-- ========================================
-- 3. HAUSVERWALTUNGS-HONORAR
-- ========================================

CREATE TABLE public.management_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'verwaltung' CHECK (fee_type IN ('verwaltung', 'sonderverwaltung', 'rechtsgeschaeft')),
  basis_type TEXT NOT NULL DEFAULT 'pro_einheit' CHECK (basis_type IN ('pro_einheit', 'prozent_miete', 'pauschal', 'pro_qm')),
  basis_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_count INTEGER,
  total_area NUMERIC(10,2),
  calculated_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_with_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, property_id, year, fee_type)
);

ALTER TABLE public.management_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fees in their org"
ON public.management_fees FOR SELECT TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can insert fees in their org"
ON public.management_fees FOR INSERT TO authenticated
WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Users can update fees in their org"
ON public.management_fees FOR UPDATE TO authenticated
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can delete fees in their org"
ON public.management_fees FOR DELETE TO authenticated
USING (organization_id = public.user_org_id());

-- Triggers for updated_at
CREATE TRIGGER update_meters_updated_at BEFORE UPDATE ON public.meters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.tenant_announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_management_fees_updated_at BEFORE UPDATE ON public.management_fees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();