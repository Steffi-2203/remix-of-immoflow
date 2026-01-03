-- Enum Types für die Anwendung
CREATE TYPE public.unit_type AS ENUM ('wohnung', 'geschaeft', 'garage', 'stellplatz', 'lager', 'sonstiges');
CREATE TYPE public.tenant_status AS ENUM ('aktiv', 'leerstand', 'beendet');
CREATE TYPE public.invoice_status AS ENUM ('offen', 'bezahlt', 'teilbezahlt', 'ueberfaellig');
CREATE TYPE public.payment_type AS ENUM ('sepa', 'ueberweisung', 'bar', 'sonstiges');
CREATE TYPE public.settlement_status AS ENUM ('entwurf', 'berechnet', 'versendet', 'abgeschlossen');

-- Liegenschaften (Properties)
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Österreich',
  building_year INTEGER,
  total_units INTEGER NOT NULL DEFAULT 0,
  total_qm DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_mea DECIMAL(10,2) NOT NULL DEFAULT 0,
  bk_anteil_wohnung DECIMAL(5,2) NOT NULL DEFAULT 10,
  bk_anteil_geschaeft DECIMAL(5,2) NOT NULL DEFAULT 20,
  bk_anteil_garage DECIMAL(5,2) NOT NULL DEFAULT 20,
  heizung_anteil_wohnung DECIMAL(5,2) NOT NULL DEFAULT 20,
  heizung_anteil_geschaeft DECIMAL(5,2) NOT NULL DEFAULT 20,
  betriebskosten_gesamt DECIMAL(12,2) NOT NULL DEFAULT 0,
  heizungskosten_gesamt DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Einheiten (Units)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  top_nummer TEXT NOT NULL,
  type public.unit_type NOT NULL DEFAULT 'wohnung',
  floor INTEGER,
  qm DECIMAL(10,2) NOT NULL DEFAULT 0,
  mea DECIMAL(10,4) NOT NULL DEFAULT 0,
  status public.tenant_status NOT NULL DEFAULT 'leerstand',
  -- Verteilerschlüssel-Werte (alle 20)
  vs_qm DECIMAL(10,2) DEFAULT 0,
  vs_mea DECIMAL(10,4) DEFAULT 0,
  vs_personen INTEGER DEFAULT 0,
  vs_heizung_verbrauch DECIMAL(10,2) DEFAULT 0,
  vs_wasser_verbrauch DECIMAL(10,2) DEFAULT 0,
  vs_lift_wohnung DECIMAL(10,2) DEFAULT 0,
  vs_lift_geschaeft DECIMAL(10,2) DEFAULT 0,
  vs_muell DECIMAL(10,2) DEFAULT 0,
  vs_strom_allgemein DECIMAL(10,2) DEFAULT 0,
  vs_versicherung DECIMAL(10,2) DEFAULT 0,
  vs_hausbetreuung DECIMAL(10,2) DEFAULT 0,
  vs_garten DECIMAL(10,2) DEFAULT 0,
  vs_schneeraeumung DECIMAL(10,2) DEFAULT 0,
  vs_kanal DECIMAL(10,2) DEFAULT 0,
  vs_grundsteuer DECIMAL(10,2) DEFAULT 0,
  vs_verwaltung DECIMAL(10,2) DEFAULT 0,
  vs_ruecklage DECIMAL(10,2) DEFAULT 0,
  vs_sonstiges_1 DECIMAL(10,2) DEFAULT 0,
  vs_sonstiges_2 DECIMAL(10,2) DEFAULT 0,
  vs_sonstiges_3 DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mieter (Tenants)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mietbeginn DATE NOT NULL,
  mietende DATE,
  kaution DECIMAL(10,2) NOT NULL DEFAULT 0,
  kaution_bezahlt BOOLEAN NOT NULL DEFAULT false,
  grundmiete DECIMAL(10,2) NOT NULL DEFAULT 0,
  betriebskosten_vorschuss DECIMAL(10,2) NOT NULL DEFAULT 0,
  heizungskosten_vorschuss DECIMAL(10,2) NOT NULL DEFAULT 0,
  sepa_mandat BOOLEAN NOT NULL DEFAULT false,
  iban TEXT,
  bic TEXT,
  mandat_reference TEXT,
  status public.tenant_status NOT NULL DEFAULT 'aktiv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monatliche Vorschreibungen (Monthly Invoices)
CREATE TABLE public.monthly_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  grundmiete DECIMAL(10,2) NOT NULL DEFAULT 0,
  betriebskosten DECIMAL(10,2) NOT NULL DEFAULT 0,
  heizungskosten DECIMAL(10,2) NOT NULL DEFAULT 0,
  gesamtbetrag DECIMAL(10,2) NOT NULL DEFAULT 0,
  ust DECIMAL(10,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'offen',
  faellig_am DATE NOT NULL,
  bezahlt_am DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Zahlungseingänge (Payments)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.monthly_invoices(id) ON DELETE SET NULL,
  betrag DECIMAL(10,2) NOT NULL,
  zahlungsart public.payment_type NOT NULL DEFAULT 'ueberweisung',
  referenz TEXT,
  eingangs_datum DATE NOT NULL,
  buchungs_datum DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Betriebskostenabrechnungen (Operating Cost Settlements)
CREATE TABLE public.operating_cost_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  status public.settlement_status NOT NULL DEFAULT 'entwurf',
  gesamtkosten DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Liegenschafts-Dokumente
CREATE TABLE public.property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Einheiten-Dokumente
CREATE TABLE public.unit_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_cost_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_documents ENABLE ROW LEVEL SECURITY;

-- Für den MVP: Öffentlicher Zugriff (später durch Auth ersetzen)
CREATE POLICY "Allow all access to properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to units" ON public.units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to monthly_invoices" ON public.monthly_invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to operating_cost_settlements" ON public.operating_cost_settlements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to property_documents" ON public.property_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to unit_documents" ON public.unit_documents FOR ALL USING (true) WITH CHECK (true);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.operating_cost_settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();