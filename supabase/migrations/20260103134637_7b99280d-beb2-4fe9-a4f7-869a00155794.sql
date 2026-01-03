-- Create storage bucket for expense receipts/invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for expense receipts bucket
CREATE POLICY "Allow public read access to expense receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-receipts');

CREATE POLICY "Allow authenticated uploads to expense receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "Allow authenticated updates to expense receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'expense-receipts');

CREATE POLICY "Allow authenticated deletes from expense receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'expense-receipts');

-- Add beleg_url column to expenses table for storing the PDF URL
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS beleg_url TEXT;