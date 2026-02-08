
DROP TRIGGER IF EXISTS trg_invoice_lines_normalize ON invoice_lines;
DROP FUNCTION IF EXISTS invoice_lines_normalize_description_trigger();
DROP FUNCTION IF EXISTS invoice_lines_normalize_text();
DROP INDEX IF EXISTS invoice_lines_unique_idx;
ALTER TABLE invoice_lines DROP COLUMN IF EXISTS normalized_description;
