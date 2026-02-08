
-- Create invoice_lines table
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES monthly_invoices(id),
  unit_id uuid REFERENCES units(id),
  line_type varchar(50) NOT NULL,
  description text,
  normalized_description text,
  amount numeric(12,2) NOT NULL,
  tax_rate integer DEFAULT 0,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_unit ON invoice_lines (unit_id);

-- Unique index on normalized_description
CREATE UNIQUE INDEX IF NOT EXISTS invoice_lines_unique_idx
  ON invoice_lines (invoice_id, unit_id, line_type, normalized_description);

-- Trigger to auto-populate normalized_description
CREATE OR REPLACE FUNCTION invoice_lines_normalize_description() RETURNS trigger AS $$
BEGIN
  IF NEW.description IS NOT NULL THEN
    NEW.normalized_description := regexp_replace(lower(trim(NEW.description)), '\s+', ' ', 'g');
  ELSE
    NEW.normalized_description := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_lines_normalize ON invoice_lines;
CREATE TRIGGER trg_invoice_lines_normalize
  BEFORE INSERT OR UPDATE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION invoice_lines_normalize_description();

-- RLS
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice lines" ON invoice_lines
  FOR SELECT USING (true);

CREATE POLICY "Users can insert invoice lines" ON invoice_lines
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update invoice lines" ON invoice_lines
  FOR UPDATE USING (true);
