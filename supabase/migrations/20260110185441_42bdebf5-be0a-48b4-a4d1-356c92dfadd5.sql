-- BIC-Spalte zur bank_accounts Tabelle hinzufügen
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS bic TEXT;