-- Add transaction_id to expenses for linking with bank transactions
ALTER TABLE public.expenses 
ADD COLUMN transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_expenses_transaction_id ON public.expenses(transaction_id);

-- Add index for matching queries (amount + date range)
CREATE INDEX idx_transactions_matching ON public.transactions(amount, transaction_date);
