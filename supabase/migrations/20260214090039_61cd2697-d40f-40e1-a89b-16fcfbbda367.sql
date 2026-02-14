
-- Fix overly permissive document_tags policy
DROP POLICY "Authenticated users can manage tags" ON public.document_tags;

CREATE POLICY "Authenticated users can insert tags"
  ON public.document_tags FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tags"
  ON public.document_tags FOR DELETE TO authenticated
  USING (true);
