
-- Migration: create sepa_batches table for SEPA submission tracking
CREATE TABLE IF NOT EXISTS public.sepa_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id),
  property_id uuid REFERENCES public.properties(id),
  status text NOT NULL DEFAULT 'created',
  xml text,
  psp_response jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sepa_batches_batchid_unique ON public.sepa_batches(batch_id);

-- RLS
ALTER TABLE public.sepa_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org SEPA batches"
  ON public.sepa_batches FOR SELECT
  TO authenticated
  USING (organization_id = public.user_org_id());

CREATE POLICY "Users can insert own org SEPA batches"
  ON public.sepa_batches FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Users can update own org SEPA batches"
  ON public.sepa_batches FOR UPDATE
  TO authenticated
  USING (organization_id = public.user_org_id());

CREATE POLICY "Service role full access to SEPA batches"
  ON public.sepa_batches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at trigger (reuse existing function)
CREATE TRIGGER trg_sepa_batches_updated_at
  BEFORE UPDATE ON public.sepa_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
