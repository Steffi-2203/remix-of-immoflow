
-- 1. RLS aktivieren
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 2. SELECT: nur admin oder auditor
CREATE POLICY "Admins and auditors can read audit_events"
ON public.audit_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'auditor')
);

-- 3. INSERT: alle authentifizierten Nutzer
CREATE POLICY "Authenticated users can insert audit_events"
ON public.audit_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Immutability-Trigger: UPDATE blockieren
CREATE OR REPLACE FUNCTION public.prevent_audit_event_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be updated';
  RETURN NULL;
END;
$$;

CREATE TRIGGER prevent_audit_event_update
BEFORE UPDATE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_update();

-- 5. Immutability-Trigger: DELETE blockieren
CREATE OR REPLACE FUNCTION public.prevent_audit_event_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable and cannot be deleted';
  RETURN NULL;
END;
$$;

CREATE TRIGGER prevent_audit_event_delete
BEFORE DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_delete();
