-- ci/schema.sql
-- Minimal schema for CI smoke tests. Idempotent (IF NOT EXISTS everywhere).
-- Mirrors shared/schema.ts — only the tables needed by load_test_bulk.sh + batch_upsert.js

-- Enums
DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM ('aktiv', 'leerstand', 'beendet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE unit_type AS ENUM ('wohnung', 'geschaeft', 'garage', 'stellplatz', 'lager', 'sonstiges');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('offen', 'bezahlt', 'teilbezahlt', 'ueberfaellig');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('incomplete', 'trial', 'active', 'incomplete_expired', 'cancelled', 'trialing', 'expired', 'past_due', 'canceled', 'unpaid', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subscription_tier subscription_tier DEFAULT 'starter',
  subscription_status subscription_status DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  iban TEXT,
  bic TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  brand_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  support_email TEXT
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Units
CREATE TABLE IF NOT EXISTS units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
CREATE UNIQUE INDEX IF NOT EXISTS units_property_top_unique ON units(property_id, top_nummer);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
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

-- Monthly Invoices
CREATE TABLE IF NOT EXISTS monthly_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  unit_id UUID NOT NULL REFERENCES units(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  grundmiete NUMERIC(10,2),
  betriebskosten NUMERIC(10,2),
  heizungskosten NUMERIC(10,2),
  ust_satz_miete INTEGER,
  ust_satz_bk INTEGER,
  ust_satz_heizung INTEGER,
  ust NUMERIC(10,2),
  gesamtbetrag NUMERIC(10,2),
  status invoice_status DEFAULT 'offen',
  faellig_am DATE,
  pdf_url TEXT,
  vortrag_miete NUMERIC(10,2),
  vortrag_bk NUMERIC(10,2),
  vortrag_hk NUMERIC(10,2),
  vortrag_sonstige NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  wasserkosten NUMERIC(10,2),
  ust_satz_wasser INTEGER,
  paid_amount NUMERIC(10,2),
  version INTEGER NOT NULL DEFAULT 1,
  is_vacancy BOOLEAN DEFAULT false,
  run_id UUID,
  weg_budget_plan_id UUID,
  owner_id UUID
);

-- Invoice Lines
CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES monthly_invoices(id),
  line_type VARCHAR NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  tax_rate INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  unit_id UUID,
  meta JSONB,
  normalized_description TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS invoice_lines_unique_key
  ON invoice_lines(invoice_id, unit_id, line_type, normalized_description);

-- Normalized description trigger
CREATE OR REPLACE FUNCTION normalize_description_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.description IS NOT NULL THEN
    NEW.normalized_description := lower(regexp_replace(trim(normalize(NEW.description, NFC)), '\s+', ' ', 'g'));
  ELSE
    NEW.normalized_description := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_description ON invoice_lines;
CREATE TRIGGER trg_normalize_description
  BEFORE INSERT OR UPDATE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION normalize_description_trigger();

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  run_id TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reconcile Runs
CREATE TABLE IF NOT EXISTS reconcile_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'batch_upsert',
  status TEXT NOT NULL DEFAULT 'started',
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  error TEXT,
  meta JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reconcile_runs_run_id ON reconcile_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_reconcile_runs_status ON reconcile_runs(status);

-- Seed a default organization if none exists (for CI)
INSERT INTO organizations (id, name) 
SELECT gen_random_uuid(), 'CI Smoke Test Org'
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);
