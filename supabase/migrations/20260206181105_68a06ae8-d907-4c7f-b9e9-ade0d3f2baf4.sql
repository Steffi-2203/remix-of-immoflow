
-- =============================================
-- 1. Kontenplan (Chart of Accounts) für HV
-- =============================================
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  account_number TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_system BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, account_number)
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org accounts"
  ON public.chart_of_accounts FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    OR organization_id IS NULL
  );

CREATE POLICY "Admins can manage accounts"
  ON public.chart_of_accounts FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND public.is_admin(auth.uid())
  );

-- =============================================
-- 2. Buchungsjournal (Journal Entries)
-- =============================================
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  entry_date DATE NOT NULL,
  booking_number TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Referenzen
  property_id UUID REFERENCES public.properties(id),
  unit_id UUID REFERENCES public.units(id),
  tenant_id UUID REFERENCES public.tenants(id),
  -- Quell-Referenz (welche Aktion hat die Buchung ausgelöst)
  source_type TEXT CHECK (source_type IN ('invoice', 'payment', 'expense', 'manual', 'settlement', 'deposit', 'adjustment')),
  source_id UUID,
  -- Beleg
  beleg_nummer TEXT,
  beleg_url TEXT,
  -- Status
  is_storno BOOLEAN NOT NULL DEFAULT false,
  storno_of UUID REFERENCES public.journal_entries(id),
  -- Meta
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org journal entries"
  ON public.journal_entries FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with finance access can manage journal entries"
  ON public.journal_entries FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_finance_access(auth.uid())
  );

-- =============================================
-- 3. Buchungszeilen (Journal Entry Lines - Soll/Haben)
-- =============================================
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
  )
);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org journal lines"
  ON public.journal_entry_lines FOR SELECT
  USING (
    journal_entry_id IN (
      SELECT id FROM public.journal_entries 
      WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Finance users can manage journal lines"
  ON public.journal_entry_lines FOR ALL
  USING (
    journal_entry_id IN (
      SELECT id FROM public.journal_entries 
      WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      AND public.has_finance_access(auth.uid())
    )
  );

-- =============================================
-- 4. Laufende Buchungsnummer pro Organisation
-- =============================================
CREATE TABLE public.booking_number_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) UNIQUE,
  current_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  current_number INT NOT NULL DEFAULT 0
);

ALTER TABLE public.booking_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sequences"
  ON public.booking_number_sequences FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Finance can manage sequences"
  ON public.booking_number_sequences FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_finance_access(auth.uid())
  );

-- =============================================
-- 5. Funktion: Nächste Buchungsnummer generieren
-- =============================================
CREATE OR REPLACE FUNCTION public.next_booking_number(_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _year INT := EXTRACT(YEAR FROM now());
  _num INT;
BEGIN
  INSERT INTO booking_number_sequences (organization_id, current_year, current_number)
  VALUES (_org_id, _year, 1)
  ON CONFLICT (organization_id) DO UPDATE
  SET current_number = CASE
    WHEN booking_number_sequences.current_year = _year THEN booking_number_sequences.current_number + 1
    ELSE 1
  END,
  current_year = _year
  RETURNING current_number INTO _num;

  RETURN _year || '-' || LPAD(_num::TEXT, 5, '0');
END;
$$;

-- =============================================
-- 6. Standard-Kontenplan für HV (bei neuer Org)
-- =============================================
CREATE OR REPLACE FUNCTION public.create_default_chart_of_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- AKTIVA (Assets)
  INSERT INTO chart_of_accounts (organization_id, account_number, name, account_type, description) VALUES
    (NEW.id, '2800', 'Bank', 'asset', 'Bankkonten'),
    (NEW.id, '2000', 'Kassa', 'asset', 'Barkasse'),
    (NEW.id, '2300', 'Kautionen (Aktiv)', 'asset', 'Mietkautionen als Sicherheit'),
    (NEW.id, '2100', 'Forderungen Mieter', 'asset', 'Offene Mietforderungen'),
    (NEW.id, '2110', 'Forderungen BK', 'asset', 'Offene BK-Nachzahlungen'),
    (NEW.id, '0100', 'Gebäude', 'asset', 'Immobilien Anlagevermögen'),
    (NEW.id, '0700', 'Betriebs- und Geschäftsausstattung', 'asset', 'Inventar');

  -- PASSIVA (Liabilities)
  INSERT INTO chart_of_accounts (organization_id, account_number, name, account_type, description) VALUES
    (NEW.id, '3300', 'Verbindlichkeiten Lieferanten', 'liability', 'Offene Rechnungen'),
    (NEW.id, '3500', 'Kautionen (Passiv)', 'liability', 'Erhaltene Kautionen'),
    (NEW.id, '3520', 'Vorauszahlungen Mieter', 'liability', 'BK-Vorauszahlungen'),
    (NEW.id, '3540', 'USt-Zahllast', 'liability', 'Umsatzsteuer-Verbindlichkeit'),
    (NEW.id, '2500', 'Vorsteuer', 'asset', 'Vorsteuer aus Eingangsrechnungen'),
    (NEW.id, '3560', 'Rücklage', 'liability', 'Instandhaltungsrücklage');

  -- EIGENKAPITAL (Equity)
  INSERT INTO chart_of_accounts (organization_id, account_number, name, account_type, description) VALUES
    (NEW.id, '9000', 'Eigenkapital', 'equity', 'Eigenkapitalkonto');

  -- ERTRÄGE (Income)
  INSERT INTO chart_of_accounts (organization_id, account_number, name, account_type, description) VALUES
    (NEW.id, '4000', 'Mieterlöse', 'income', 'Grundmiete'),
    (NEW.id, '4100', 'BK-Erlöse', 'income', 'Betriebskosten-Weiterverrechnung'),
    (NEW.id, '4200', 'HK-Erlöse', 'income', 'Heizkosten-Weiterverrechnung'),
    (NEW.id, '4300', 'Sonstige Erlöse', 'income', 'Sonstige Einnahmen'),
    (NEW.id, '4400', 'BK-Nachzahlungen', 'income', 'Nachzahlungen aus BK-Abrechnung');

  -- AUFWAND (Expenses)
  INSERT INTO chart_of_accounts (organization_id, account_number, name, account_type, description) VALUES
    (NEW.id, '5000', 'Versicherungen', 'expense', 'Gebäudeversicherungen'),
    (NEW.id, '5100', 'Instandhaltung', 'expense', 'Reparaturen und Wartung'),
    (NEW.id, '5200', 'Lift/Aufzug', 'expense', 'Liftkosten'),
    (NEW.id, '5300', 'Heizung', 'expense', 'Heizkosten'),
    (NEW.id, '5400', 'Wasser/Abwasser', 'expense', 'Wasserkosten'),
    (NEW.id, '5500', 'Strom Allgemein', 'expense', 'Allgemeinstrom'),
    (NEW.id, '5600', 'Müllabfuhr', 'expense', 'Müllentsorgung'),
    (NEW.id, '5700', 'Hausbetreuung', 'expense', 'Reinigung und Betreuung'),
    (NEW.id, '5800', 'Gartenpflege', 'expense', 'Grünflächen'),
    (NEW.id, '5900', 'Schneeräumung', 'expense', 'Winterdienst'),
    (NEW.id, '6000', 'Grundsteuer', 'expense', 'Grundsteuer'),
    (NEW.id, '6100', 'Verwaltungskosten', 'expense', 'Hausverwaltungshonorar'),
    (NEW.id, '6200', 'Kanalgebühren', 'expense', 'Kanal'),
    (NEW.id, '6300', 'Sonstige BK', 'expense', 'Sonstige Betriebskosten'),
    (NEW.id, '7000', 'Abschreibungen', 'expense', 'AfA Gebäude und Ausstattung'),
    (NEW.id, '7100', 'Bankspesen', 'expense', 'Kontoführung und Gebühren');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created_chart
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_chart_of_accounts();

-- Updated_at triggers
CREATE TRIGGER update_chart_of_accounts_updated_at
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
