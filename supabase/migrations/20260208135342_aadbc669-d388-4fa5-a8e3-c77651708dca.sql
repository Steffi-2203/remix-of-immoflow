
-- ============================================================================
-- Billing Runs: Run-level state machine + metadata
-- ============================================================================

-- Run status enum
DO $$ BEGIN CREATE TYPE billing_run_status AS ENUM (
  'pending', 'running', 'completed', 'failed', 'cancelled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.billing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Metadata
  description TEXT,
  triggered_by UUID,
  -- Counters
  expected_lines INTEGER NOT NULL DEFAULT 0,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  completed_chunks INTEGER NOT NULL DEFAULT 0,
  failed_chunks INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  -- Artifacts
  artifacts JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  -- Timestamps (state machine)
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_runs_status ON public.billing_runs(status);
CREATE INDEX IF NOT EXISTS idx_billing_runs_created ON public.billing_runs(created_at DESC);

-- Add billing_run_id FK to reconcile_runs (chunk-level)
DO $$ BEGIN
  ALTER TABLE public.reconcile_runs
    ADD COLUMN IF NOT EXISTS billing_run_id UUID REFERENCES public.billing_runs(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_reconcile_runs_billing_run ON public.reconcile_runs(billing_run_id);

-- Enable RLS
ALTER TABLE public.billing_runs ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can view billing runs"
  ON public.billing_runs FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert billing runs"
  ON public.billing_runs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update billing runs"
  ON public.billing_runs FOR UPDATE
  USING (public.is_admin(auth.uid()));
