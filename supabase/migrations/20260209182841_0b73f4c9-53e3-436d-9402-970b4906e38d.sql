-- Add email tracking columns to monthly_invoices
ALTER TABLE public.monthly_invoices
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT NULL;