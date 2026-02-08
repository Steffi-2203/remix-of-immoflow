
-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_invoice_lines_normalize ON invoice_lines;
DROP FUNCTION IF EXISTS invoice_lines_normalize_description();

-- Drop new unique index and restore backup index if exists
DROP INDEX IF EXISTS invoice_lines_unique_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'invoice_lines_unique_idx_backup'
  ) THEN
    EXECUTE 'ALTER INDEX invoice_lines_unique_idx_backup RENAME TO invoice_lines_unique_idx';
  END IF;
END$$;

-- Drop column
ALTER TABLE invoice_lines DROP COLUMN IF EXISTS normalized_description;
