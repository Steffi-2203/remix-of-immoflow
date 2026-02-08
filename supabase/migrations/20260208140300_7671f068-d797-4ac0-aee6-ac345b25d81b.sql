
-- Tighten insert policy: only finance users can insert tombstones
DROP POLICY IF EXISTS "Service can insert tombstones" ON public.merge_tombstones;
CREATE POLICY "Finance users can insert tombstones"
  ON public.merge_tombstones FOR INSERT
  WITH CHECK (public.has_finance_access(auth.uid()));
