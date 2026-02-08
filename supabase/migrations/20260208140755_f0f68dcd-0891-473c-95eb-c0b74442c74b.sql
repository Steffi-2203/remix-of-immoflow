
-- Add performance metrics columns to billing_runs
ALTER TABLE public.billing_runs
  ADD COLUMN IF NOT EXISTS rows_per_second NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS peak_chunk_duration_ms INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avg_chunk_duration_ms INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS conflict_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conflict_rate NUMERIC(5,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scenario_tag TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parallel_jobs INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS batch_size INTEGER NOT NULL DEFAULT 10000;

-- Index for scenario-based filtering
CREATE INDEX IF NOT EXISTS idx_billing_runs_scenario ON public.billing_runs (scenario_tag) WHERE scenario_tag IS NOT NULL;

COMMENT ON COLUMN public.billing_runs.rows_per_second IS 'Throughput: total rows / duration seconds';
COMMENT ON COLUMN public.billing_runs.peak_chunk_duration_ms IS 'Slowest chunk p100 latency in ms';
COMMENT ON COLUMN public.billing_runs.avg_chunk_duration_ms IS 'Average chunk duration in ms';
COMMENT ON COLUMN public.billing_runs.conflict_rate IS 'Fraction of rows that hit ON CONFLICT (0.0-1.0)';
COMMENT ON COLUMN public.billing_runs.scenario_tag IS 'Load test scenario label e.g. S1-10k, S2-50k, S3-100k';
