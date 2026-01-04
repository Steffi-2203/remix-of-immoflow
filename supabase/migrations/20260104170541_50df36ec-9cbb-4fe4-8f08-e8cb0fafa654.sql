-- Add dunning tracking columns to monthly_invoices
ALTER TABLE public.monthly_invoices
ADD COLUMN IF NOT EXISTS mahnstufe integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS zahlungserinnerung_am timestamp with time zone,
ADD COLUMN IF NOT EXISTS mahnung_am timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.monthly_invoices.mahnstufe IS '0=Keine, 1=Zahlungserinnerung, 2=Mahnung';
COMMENT ON COLUMN public.monthly_invoices.zahlungserinnerung_am IS 'Datum der Zahlungserinnerung';
COMMENT ON COLUMN public.monthly_invoices.mahnung_am IS 'Datum der Mahnung';