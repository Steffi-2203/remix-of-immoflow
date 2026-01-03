-- Erweitere monthly_invoices Tabelle um separate MwSt-Felder für jede Kategorie
-- Alle Beträge sind Bruttobeträge, MwSt wird als Prozentsatz gespeichert

ALTER TABLE public.monthly_invoices 
ADD COLUMN IF NOT EXISTS ust_satz_miete numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ust_satz_bk numeric NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS ust_satz_heizung numeric NOT NULL DEFAULT 20;

-- Kommentar zur Erklärung
COMMENT ON COLUMN public.monthly_invoices.grundmiete IS 'Bruttomiete inkl. MwSt';
COMMENT ON COLUMN public.monthly_invoices.betriebskosten IS 'Brutto-Betriebskosten inkl. MwSt';
COMMENT ON COLUMN public.monthly_invoices.heizungskosten IS 'Brutto-Heizungskosten inkl. MwSt';
COMMENT ON COLUMN public.monthly_invoices.ust_satz_miete IS 'MwSt-Satz für Miete in Prozent (z.B. 10 für 10%)';
COMMENT ON COLUMN public.monthly_invoices.ust_satz_bk IS 'MwSt-Satz für Betriebskosten in Prozent (z.B. 10 für 10%)';
COMMENT ON COLUMN public.monthly_invoices.ust_satz_heizung IS 'MwSt-Satz für Heizungskosten in Prozent (z.B. 20 für 20%)';