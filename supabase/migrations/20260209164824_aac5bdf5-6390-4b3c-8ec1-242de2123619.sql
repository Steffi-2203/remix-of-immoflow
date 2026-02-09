CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid,
  actor text NOT NULL,
  event_type text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  operation text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit events are readable by authenticated users"
ON public.audit_events FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Audit events can be inserted by authenticated users"
ON public.audit_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_audit_events_run_id ON public.audit_events(run_id);
CREATE INDEX idx_audit_events_entity ON public.audit_events(entity, entity_id);
CREATE INDEX idx_audit_events_created_at ON public.audit_events(created_at DESC);