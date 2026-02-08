
-- 1) Add normalized_description column
ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS normalized_description text;

-- 2) Create normalization function (same logic as server lib)
CREATE OR REPLACE FUNCTION invoice_lines_normalize_text(in_text text) RETURNS text AS $$
BEGIN
  IF in_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN regexp_replace(lower(trim(in_text)), '\s+', ' ', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- 3) Trigger function to set normalized_description on insert/update
CREATE OR REPLACE FUNCTION invoice_lines_normalize_description_trigger() RETURNS trigger AS $$
BEGIN
  NEW.normalized_description := invoice_lines_normalize_text(NEW.description);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_invoice_lines_normalize ON invoice_lines;

CREATE TRIGGER trg_invoice_lines_normalize
  BEFORE INSERT OR UPDATE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION invoice_lines_normalize_description_trigger();

-- 4) Create unique index using normalized_description
CREATE UNIQUE INDEX IF NOT EXISTS invoice_lines_unique_idx
  ON invoice_lines (invoice_id, unit_id, line_type, normalized_description);
