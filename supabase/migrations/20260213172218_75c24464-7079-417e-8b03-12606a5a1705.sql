
-- Add matching metadata columns to transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS match_confidence varchar(10),
  ADD COLUMN IF NOT EXISTS match_method varchar(20),
  ADD COLUMN IF NOT EXISTS end_to_end_id text;
