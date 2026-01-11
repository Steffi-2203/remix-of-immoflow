-- Neue Spalten für Vier-Augen-Prinzip
ALTER TABLE public.maintenance_invoices 
ADD COLUMN IF NOT EXISTS pre_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS pre_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS final_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS final_approved_at timestamptz;