
-- Fix: Tighten retention_locks INSERT policy to org members only
DROP POLICY IF EXISTS "Retention locks insert via service" ON public.retention_locks;
CREATE POLICY "Retention locks insert by org members"
  ON public.retention_locks FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));
