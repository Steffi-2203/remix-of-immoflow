-- Add SEPA creditor fields to organizations table for SEPA direct debit export
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS sepa_creditor_id TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS bic TEXT;

COMMENT ON COLUMN public.organizations.sepa_creditor_id IS 'SEPA Gläubiger-ID für Lastschrifteinzug';
COMMENT ON COLUMN public.organizations.iban IS 'IBAN des Organisationskontos';
COMMENT ON COLUMN public.organizations.bic IS 'BIC des Organisationskontos';