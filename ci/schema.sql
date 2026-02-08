-- ============================================================================
-- CI Bootstrap Schema (idempotent)
-- Erstellt die Basistabellen, die run-migration.cjs und der CI-Workflow
-- benötigen. Wird VOR den Migrations ausgeführt.
--
-- RULES:
--   1. ALL statements must be idempotent (IF NOT EXISTS, DO $$ ... $$)
--   2. NO GENERATED ALWAYS columns — use regular columns + trigger/view
--   3. Aligned with production schema (snake_case, same types)
-- ============================================================================

BEGIN;

-- ── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Enums (idempotent via DO block) ────────────────────────────────────────
DO $$ BEGIN CREATE TYPE invoice_status AS ENUM ('offen', 'bezahlt', 'teilbezahlt', 'ueberfaellig'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE expense_category AS ENUM ('betriebskosten_umlagefaehig', 'instandhaltung'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE expense_type AS ENUM (
  'versicherung', 'grundsteuer', 'muellabfuhr', 'wasser_abwasser', 'heizung',
  'strom_allgemein', 'hausbetreuung', 'lift', 'gartenpflege', 'schneeraeumung',
  'verwaltung', 'ruecklage', 'reparatur', 'sanierung', 'sonstiges'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tenant_status AS ENUM ('aktiv', 'leerstand', 'beendet'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE unit_type AS ENUM ('wohnung', 'geschaeft', 'garage', 'stellplatz', 'lager', 'sonstiges'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE mrg_bk_kategorie AS ENUM (
  'wasserversorgung', 'abwasserentsorgung', 'muellabfuhr', 'kanalraeumung',
  'hausreinigung', 'hausbetreuung', 'rauchfangkehrer', 'schaedlingsbekaempfung',
  'lichtkosten', 'beleuchtung', 'feuerversicherung', 'haftpflichtversicherung',
  'leitungswasserschaden', 'sturmschaden', 'glasversicherung',
  'grundsteuer', 'verwaltung', 'sonstige'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE app_role AS ENUM ('admin', 'manager', 'viewer', 'finance', 'accountant'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Organizations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Profiles ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  full_name TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── User Roles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Properties ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  total_units INTEGER DEFAULT 0,
  total_area NUMERIC(10,2),
  construction_year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ── Property Managers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES properties(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, property_id)
);

-- ── Units ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  top_nummer TEXT NOT NULL,
  type unit_type DEFAULT 'wohnung',
  status tenant_status DEFAULT 'leerstand',
  flaeche NUMERIC(10,2),
  zimmer INTEGER,
  nutzwert NUMERIC(10,4),
  stockwerk INTEGER,
  vs_personen INTEGER DEFAULT 0,
  leerstand_bk NUMERIC(10,2) DEFAULT 0,
  leerstand_hk NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ── Tenants ────────────────────────────────────────────────────────────────
-- NOTE: first_name and last_name are plain columns, NOT GENERATED ALWAYS.
-- Production uses the same pattern. Never use GENERATED columns in CI schema.
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id),
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  status tenant_status DEFAULT 'aktiv',
  mietbeginn DATE,
  mietende DATE,
  grundmiete NUMERIC(10,2) DEFAULT 0,
  betriebskosten_vorschuss NUMERIC(10,2) DEFAULT 0,
  heizungskosten_vorschuss NUMERIC(10,2) DEFAULT 0,
  wasserkosten_vorschuss NUMERIC(10,2) DEFAULT 0,
  warmwasserkosten_vorschuss NUMERIC(10,2) DEFAULT 0,
  sonstige_kosten JSONB,
  kaution NUMERIC(10,2),
  kaution_bezahlt BOOLEAN DEFAULT false,
  iban TEXT,
  bic TEXT,
  sepa_mandat BOOLEAN DEFAULT false,
  sepa_mandat_datum DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ── Monthly Invoices (Vorschreibungen) ─────────────────────────────────────
-- NOTE: vortrag_gesamt is a plain NUMERIC column, NOT GENERATED ALWAYS.
-- A trigger keeps it in sync. This avoids GENERATED column issues in CI/restore.
CREATE TABLE IF NOT EXISTS monthly_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  grundmiete NUMERIC(10,2) DEFAULT 0,
  betriebskosten NUMERIC(10,2) DEFAULT 0,
  heizungskosten NUMERIC(10,2) DEFAULT 0,
  wasserkosten NUMERIC(10,2) DEFAULT 0,
  ust_satz_miete INTEGER DEFAULT 10,
  ust_satz_bk INTEGER DEFAULT 10,
  ust_satz_heizung INTEGER DEFAULT 20,
  ust_satz_wasser INTEGER DEFAULT 10,
  ust NUMERIC(10,2) DEFAULT 0,
  gesamtbetrag NUMERIC(10,2) DEFAULT 0,
  status invoice_status DEFAULT 'offen',
  faellig_am DATE,
  pdf_url TEXT,
  is_vacancy BOOLEAN DEFAULT false,
  vortrag_miete NUMERIC(10,2) DEFAULT 0,
  vortrag_bk NUMERIC(10,2) DEFAULT 0,
  vortrag_hk NUMERIC(10,2) DEFAULT 0,
  vortrag_sonstige NUMERIC(10,2) DEFAULT 0,
  vortrag_gesamt NUMERIC(10,2) DEFAULT 0,
  run_id UUID,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to keep vortrag_gesamt in sync (replaces GENERATED ALWAYS)
CREATE OR REPLACE FUNCTION sync_vortrag_gesamt()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.vortrag_gesamt := COALESCE(NEW.vortrag_miete, 0)
                      + COALESCE(NEW.vortrag_bk, 0)
                      + COALESCE(NEW.vortrag_hk, 0)
                      + COALESCE(NEW.vortrag_sonstige, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vortrag_gesamt ON monthly_invoices;
CREATE TRIGGER trg_sync_vortrag_gesamt
  BEFORE INSERT OR UPDATE ON monthly_invoices
  FOR EACH ROW EXECUTE FUNCTION sync_vortrag_gesamt();

-- Unique constraint for idempotent invoice generation
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_invoices_unique
  ON monthly_invoices(unit_id, year, month, COALESCE(paid_amount, 0), COALESCE(version, 1));

-- ── Invoice Lines ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES monthly_invoices(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id),
  line_type VARCHAR(50) NOT NULL,
  description TEXT,
  normalized_description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  tax_rate INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_unit ON invoice_lines(unit_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_lines_unique
  ON invoice_lines(invoice_id, unit_id, line_type, normalized_description);

-- ── Payments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID REFERENCES monthly_invoices(id),
  betrag NUMERIC(10,2) NOT NULL,
  eingangs_datum DATE NOT NULL,
  zahlungsart TEXT DEFAULT 'ueberweisung',
  notizen TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ── Audit Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  hash TEXT,
  previous_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ── Reconcile Runs (chunk tracking) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reconcile_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL,
  chunk_id INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rows_in_chunk INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_reconcile_runs_run_id ON reconcile_runs(run_id);

-- ── Distribution Keys ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS distribution_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  property_id UUID REFERENCES properties(id),
  key_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  formula TEXT DEFAULT 'flaeche',
  unit TEXT DEFAULT 'm²',
  input_type TEXT DEFAULT 'flaeche',
  included_unit_types TEXT[],
  erlaubter_schluessel TEXT[],
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  mrg_konform BOOLEAN DEFAULT true,
  mrg_paragraph TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Bank Accounts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  property_id UUID REFERENCES properties(id),
  account_name TEXT NOT NULL,
  iban TEXT,
  bic TEXT,
  bank_name TEXT,
  opening_balance NUMERIC(10,2) DEFAULT 0,
  opening_balance_date DATE,
  current_balance NUMERIC(10,2) DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Transactions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  bank_account_id UUID REFERENCES bank_accounts(id),
  amount NUMERIC(10,2) NOT NULL,
  transaction_date DATE NOT NULL,
  booking_text TEXT,
  partner_name TEXT,
  partner_iban TEXT,
  reference TEXT,
  category_id UUID,
  is_matched BOOLEAN DEFAULT false,
  matched_tenant_id UUID REFERENCES tenants(id),
  matched_unit_id UUID REFERENCES units(id),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Expenses ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  category expense_category NOT NULL,
  expense_type expense_type DEFAULT 'sonstiges',
  bezeichnung TEXT NOT NULL,
  betrag NUMERIC(10,2) DEFAULT 0,
  datum DATE NOT NULL,
  beleg_nummer TEXT,
  beleg_url TEXT,
  notes TEXT,
  notizen TEXT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  mrg_kategorie mrg_bk_kategorie,
  mrg_paragraph TEXT,
  ist_umlagefaehig BOOLEAN DEFAULT true,
  distribution_key_id UUID REFERENCES distribution_keys(id),
  transaction_id UUID REFERENCES transactions(id),
  budget_position NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Expense Allocations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  allocated_net NUMERIC(12,2) NOT NULL,
  allocation_basis VARCHAR(50) NOT NULL,
  allocation_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense_id ON expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_unit_id ON expense_allocations(unit_id);

-- ── Leases ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  start_date DATE NOT NULL,
  end_date DATE,
  rent_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Normalize Description Trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION invoice_lines_normalize_text(in_text TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF in_text IS NULL THEN RETURN NULL; END IF;
  RETURN regexp_replace(lower(trim(in_text)), '\s+', ' ', 'g');
END;
$$;

CREATE OR REPLACE FUNCTION invoice_lines_normalize_description_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.normalized_description := invoice_lines_normalize_text(NEW.description);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_lines_normalize ON invoice_lines;
CREATE TRIGGER trg_invoice_lines_normalize
  BEFORE INSERT OR UPDATE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION invoice_lines_normalize_description_trigger();

-- ── Helper functions used by RLS / services ────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

COMMIT;
