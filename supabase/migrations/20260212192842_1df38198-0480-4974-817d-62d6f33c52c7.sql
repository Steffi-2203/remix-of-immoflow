-- Fix VPI policies: restrict INSERT/UPDATE to authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert VPI values" ON public.vpi_values;
DROP POLICY IF EXISTS "Authenticated users can update VPI values" ON public.vpi_values;

CREATE POLICY "Authenticated users can insert VPI values"
ON public.vpi_values FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update VPI values"
ON public.vpi_values FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);