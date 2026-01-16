-- Add carry-forward columns to monthly_invoices for tracking outstanding amounts from previous periods
ALTER TABLE public.monthly_invoices
ADD COLUMN IF NOT EXISTS vortrag_miete numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS vortrag_bk numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS vortrag_hk numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS vortrag_sonstige numeric DEFAULT 0 NOT NULL;

-- Add generated column for total carry-forward
ALTER TABLE public.monthly_invoices
ADD COLUMN IF NOT EXISTS vortrag_gesamt numeric GENERATED ALWAYS AS (vortrag_miete + vortrag_bk + vortrag_hk + vortrag_sonstige) STORED;

-- Add comment for documentation
COMMENT ON COLUMN public.monthly_invoices.vortrag_miete IS 'Offene Miete aus Vorperiode (Vortrag)';
COMMENT ON COLUMN public.monthly_invoices.vortrag_bk IS 'Offene Betriebskosten aus Vorperiode (Vortrag)';
COMMENT ON COLUMN public.monthly_invoices.vortrag_hk IS 'Offene Heizungskosten aus Vorperiode (Vortrag)';
COMMENT ON COLUMN public.monthly_invoices.vortrag_sonstige IS 'Sonstige offene Beträge aus Vorperiode (z.B. BK-Abrechnung)';
COMMENT ON COLUMN public.monthly_invoices.vortrag_gesamt IS 'Gesamter Vortrag aus allen Positionen';