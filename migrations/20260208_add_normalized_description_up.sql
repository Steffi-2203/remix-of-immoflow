-- ============================================================
-- UP Migration: Add normalized_description to invoice_lines
-- ============================================================
-- This migration adds a normalized_description column, backfills
-- existing rows, creates an IMMUTABLE helper function, and sets
-- up a BEFORE INSERT OR UPDATE trigger for automatic normalization.
--
-- IMPORTANT: The UPDATE backfill runs in a single statement.
-- For very large tables (>1M rows), consider running the backfill
-- in batches outside of this migration to avoid long locks:
--
--   UPDATE invoice_lines
--   SET normalized_description = invoice_lines_normalize_text(description)
--   WHERE id IN (
--     SELECT id FROM invoice_lines
--     WHERE normalized_description IS NULL
--     LIMIT 50000
--   );
--
-- Repeat until no rows remain with NULL normalized_description.
-- ============================================================

BEGIN;

-- 1. Add column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_lines'
      AND column_name = 'normalized_description'
  ) THEN
    ALTER TABLE public.invoice_lines
      ADD COLUMN normalized_description text;
  END IF;
END
$$;

-- 2. Create IMMUTABLE helper function (CREATE OR REPLACE is inherently idempotent)
CREATE OR REPLACE FUNCTION public.invoice_lines_normalize_text(in_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF in_text IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN regexp_replace(lower(trim(in_text)), '\s+', ' ', 'g');
END;
$$;

-- 3. Backfill existing rows
-- (See header comment for batch strategy on large tables)
UPDATE public.invoice_lines
SET normalized_description = public.invoice_lines_normalize_text(description)
WHERE normalized_description IS NULL
  AND description IS NOT NULL;

-- 4. Create trigger function (idempotent via CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.invoice_lines_normalize_description_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_description := public.invoice_lines_normalize_text(NEW.description);
  RETURN NEW;
END;
$$;

-- 5. Create trigger (idempotent via DROP IF EXISTS + CREATE)
DROP TRIGGER IF EXISTS trg_invoice_lines_normalize ON public.invoice_lines;

CREATE TRIGGER trg_invoice_lines_normalize
  BEFORE INSERT OR UPDATE ON public.invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.invoice_lines_normalize_description_trigger();

COMMIT;
