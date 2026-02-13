
-- Enums for payroll module
CREATE TYPE employee_status AS ENUM ('aktiv', 'karenz', 'ausgeschieden');
CREATE TYPE employment_type AS ENUM ('geringfuegig', 'teilzeit', 'vollzeit');
CREATE TYPE payroll_status AS ENUM ('entwurf', 'freigegeben', 'ausbezahlt');
CREATE TYPE elda_meldungsart AS ENUM ('anmeldung', 'abmeldung', 'aenderung', 'beitragsgrundlage');
CREATE TYPE elda_status AS ENUM ('erstellt', 'uebermittelt', 'bestaetigt', 'fehler');

-- property_employees: Hausbetreuer-Stammdaten
CREATE TABLE public.property_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  property_id UUID REFERENCES public.properties(id),
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  svnr TEXT, -- Sozialversicherungsnummer (10-stellig)
  geburtsdatum DATE,
  adresse TEXT,
  plz TEXT,
  ort TEXT,
  eintrittsdatum DATE NOT NULL,
  austrittsdatum DATE,
  beschaeftigungsart employment_type NOT NULL DEFAULT 'geringfuegig',
  wochenstunden NUMERIC(5,2) DEFAULT 0,
  bruttolohn_monatlich NUMERIC(10,2) NOT NULL DEFAULT 0,
  kollektivvertrag_stufe TEXT,
  status employee_status NOT NULL DEFAULT 'aktiv',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- payroll_entries: Monatliche Lohnabrechnungen
CREATE TABLE public.payroll_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.property_employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  bruttolohn NUMERIC(10,2) NOT NULL DEFAULT 0,
  sv_dn NUMERIC(10,2) NOT NULL DEFAULT 0,
  sv_dg NUMERIC(10,2) NOT NULL DEFAULT 0,
  lohnsteuer NUMERIC(10,2) NOT NULL DEFAULT 0,
  db_beitrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  dz_beitrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  kommunalsteuer NUMERIC(10,2) NOT NULL DEFAULT 0,
  mvk_beitrag NUMERIC(10,2) NOT NULL DEFAULT 0,
  nettolohn NUMERIC(10,2) NOT NULL DEFAULT 0,
  gesamtkosten_dg NUMERIC(10,2) NOT NULL DEFAULT 0,
  auszahlungsdatum DATE,
  status payroll_status NOT NULL DEFAULT 'entwurf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, year, month)
);

-- elda_submissions: ELDA-Meldungsprotokoll
CREATE TABLE public.elda_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  employee_id UUID NOT NULL REFERENCES public.property_employees(id) ON DELETE CASCADE,
  meldungsart elda_meldungsart NOT NULL,
  zeitraum TEXT, -- e.g. '2026-01' or '2026-01 bis 2026-03'
  xml_content TEXT,
  status elda_status NOT NULL DEFAULT 'erstellt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_property_employees_org ON public.property_employees(organization_id);
CREATE INDEX idx_property_employees_property ON public.property_employees(property_id);
CREATE INDEX idx_payroll_entries_employee ON public.payroll_entries(employee_id);
CREATE INDEX idx_payroll_entries_period ON public.payroll_entries(year, month);
CREATE INDEX idx_elda_submissions_org ON public.elda_submissions(organization_id);
CREATE INDEX idx_elda_submissions_employee ON public.elda_submissions(employee_id);

-- Updated_at triggers
CREATE TRIGGER update_property_employees_updated_at
  BEFORE UPDATE ON public.property_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.property_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elda_submissions ENABLE ROW LEVEL SECURITY;

-- property_employees policies
CREATE POLICY "Users can view employees in their org"
  ON public.property_employees FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Admins/finance can insert employees"
  ON public.property_employees FOR INSERT
  WITH CHECK (organization_id = public.user_org_id() AND public.has_finance_access(auth.uid()));

CREATE POLICY "Admins/finance can update employees"
  ON public.property_employees FOR UPDATE
  USING (organization_id = public.user_org_id() AND public.has_finance_access(auth.uid()));

CREATE POLICY "Admins/finance can delete employees"
  ON public.property_employees FOR DELETE
  USING (organization_id = public.user_org_id() AND public.has_finance_access(auth.uid()));

-- payroll_entries policies
CREATE POLICY "Users can view payroll in their org"
  ON public.payroll_entries FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Admins/finance can insert payroll"
  ON public.payroll_entries FOR INSERT
  WITH CHECK (organization_id = public.user_org_id() AND public.has_finance_access(auth.uid()));

CREATE POLICY "Admins/finance can update payroll"
  ON public.payroll_entries FOR UPDATE
  USING (organization_id = public.user_org_id() AND public.has_finance_access(auth.uid()));

-- elda_submissions policies
CREATE POLICY "Users can view ELDA submissions in their org"
  ON public.elda_submissions FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Admins/finance can insert ELDA submissions"
  ON public.elda_submissions FOR INSERT
  WITH CHECK (organization_id = public.user_org_id() AND public.has_finance_access(auth.uid()));

CREATE POLICY "Admins/finance can update ELDA submissions"
  ON public.elda_submissions FOR UPDATE
  USING (organization_id = public.user_org_id() AND public.has_finance_access(auth.uid()));

-- Add payroll-specific chart of accounts entries (via trigger on org creation won't cover existing orgs)
-- We'll add them for existing orgs and update the trigger later
INSERT INTO public.chart_of_accounts (organization_id, account_number, name, account_type, description, is_system)
SELECT o.id, acc.account_number, acc.name, acc.account_type, acc.description, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('6400', 'Löhne Hausbetreuer', 'expense', 'Löhne und Gehälter Hausbetreuer'),
  ('6500', 'SV-Beiträge Dienstgeber', 'expense', 'Sozialversicherung Dienstgeberanteil'),
  ('6560', 'DB und DZ', 'expense', 'Dienstgeberbeitrag und Zuschlag'),
  ('6600', 'Kommunalsteuer Lohn', 'expense', 'Kommunalsteuer auf Löhne'),
  ('6650', 'MVK-Beiträge', 'expense', 'Mitarbeitervorsorgekasse'),
  ('3600', 'Verbindlichkeiten AN', 'liability', 'Nettolohn-Verbindlichkeiten'),
  ('3620', 'Verbindlichkeiten SV', 'liability', 'SV-Beiträge fällig'),
  ('3640', 'Verbindlichkeiten Lohnabgaben', 'liability', 'DB, DZ, KommSt fällig')
) AS acc(account_number, name, account_type, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.chart_of_accounts ca
  WHERE ca.organization_id = o.id AND ca.account_number = acc.account_number
);
