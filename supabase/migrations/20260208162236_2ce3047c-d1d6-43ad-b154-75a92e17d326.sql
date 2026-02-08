
-- Migration: create job_runs table for worker idempotency and status tracking
CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS job_runs_jobid_unique ON public.job_runs(job_id);

-- Enable RLS
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;

-- Only admins can view job runs
CREATE POLICY "Admins can view job runs"
  ON public.job_runs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only service role / triggers can insert/update (no user policy needed)
CREATE POLICY "Service can manage job runs"
  ON public.job_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER trg_job_runs_updated_at
  BEFORE UPDATE ON public.job_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
