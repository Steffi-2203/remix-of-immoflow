-- Add missing columns to retention_locks for cron job support
ALTER TABLE public.retention_locks 
  ADD COLUMN IF NOT EXISTS standard TEXT DEFAULT 'bao',
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();