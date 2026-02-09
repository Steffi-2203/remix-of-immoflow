-- Add paid_amount + version to monthly_invoices (first migration was rolled back)
ALTER TABLE public.monthly_invoices
  ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Backfill paid_amount for bezahlt invoices
UPDATE public.monthly_invoices
SET paid_amount = gesamtbetrag
WHERE status = 'bezahlt' AND paid_amount = 0;