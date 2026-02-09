
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Admins and auditors can read audit_events" ON public.audit_events;

-- New SELECT policy based on org_id in JWT
CREATE POLICY "audit_read"
ON public.audit_events
FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'org_id' IS NOT NULL
);
