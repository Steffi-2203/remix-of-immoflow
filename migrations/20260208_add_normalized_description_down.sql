-- ============================================================
-- DOWN Migration: Remove normalized_description from invoice_lines
-- ============================================================
-- Reverses the UP migration by dropping the trigger, both
-- functions, and the column itself.
-- ============================================================

BEGIN;

-- 1. Drop trigger
DROP TRIGGER IF EXISTS trg_invoice_lines_normalize ON public.invoice_lines;

-- 2. Drop trigger function
DROP FUNCTION IF EXISTS public.invoice_lines_normalize_description_trigger();

-- 3. Drop helper function
DROP FUNCTION IF EXISTS public.invoice_lines_normalize_text(text);

-- 4. Drop column
ALTER TABLE public.invoice_lines
  DROP COLUMN IF EXISTS normalized_description;

COMMIT;
