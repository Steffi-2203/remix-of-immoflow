-- Add budget_position column to transactions table for linking bank transactions to budget positions
ALTER TABLE public.transactions 
ADD COLUMN budget_position INTEGER CHECK (budget_position >= 1 AND budget_position <= 5);