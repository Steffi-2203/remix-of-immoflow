
-- Drop existing audit_events table (empty, safe to replace)
DROP TABLE IF EXISTS public.audit_events CASCADE;

-- Create new audit_events table with canonical hash chain
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  prev_hash text,
  chain_index bigint NOT NULL,
  actor_id uuid,
  actor_org uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  signature text,
  retention_until date NOT NULL,
  immutable boolean NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE UNIQUE INDEX audit_chain_unique ON public.audit_events(chain_index);

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Read policy: users can read events for their org
CREATE POLICY "Users can view audit events for their org"
  ON public.audit_events FOR SELECT
  USING (actor_org = public.user_org_id());

-- Insert policy: authenticated users can insert for their org
CREATE POLICY "Authenticated users can insert audit events"
  ON public.audit_events FOR INSERT
  WITH CHECK (actor_org = public.user_org_id());

-- Immutability triggers (prevent UPDATE and DELETE)
CREATE OR REPLACE FUNCTION public.prevent_audit_event_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $func$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be updated';
  RETURN NULL;
END;
$func$;

CREATE OR REPLACE FUNCTION public.prevent_audit_event_delete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $func$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be deleted';
  RETURN NULL;
END;
$func$;

CREATE TRIGGER trg_prevent_audit_event_update
  BEFORE UPDATE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_update();

CREATE TRIGGER trg_prevent_audit_event_delete
  BEFORE DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_delete();
