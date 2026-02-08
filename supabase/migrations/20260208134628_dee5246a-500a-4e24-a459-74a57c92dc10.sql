
-- Reconcile runs: tracks chunked ingest progress for idempotent restarts
CREATE TABLE IF NOT EXISTS public.reconcile_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id text NOT NULL,
  chunk_id integer NOT NULL,
  total_chunks integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  rows_in_chunk integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, chunk_id)
);

-- Index for fast lookups by run_id
CREATE INDEX idx_reconcile_runs_run_id ON public.reconcile_runs (run_id);

-- Enable RLS (admin-only access via service role)
ALTER TABLE public.reconcile_runs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read reconcile runs
CREATE POLICY "Admins can view reconcile runs"
  ON public.reconcile_runs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Allow admins to manage reconcile runs
CREATE POLICY "Admins can manage reconcile runs"
  ON public.reconcile_runs FOR ALL
  USING (public.is_admin(auth.uid()));
