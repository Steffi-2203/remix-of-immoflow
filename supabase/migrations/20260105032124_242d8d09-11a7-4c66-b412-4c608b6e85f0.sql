-- Add DELETE policy for tenants table
-- Only property managers can delete tenants in their properties

CREATE POLICY "Managers can delete tenants in their properties"
ON public.tenants
FOR DELETE
USING (unit_id IN (
  SELECT units.id
  FROM units
  WHERE units.property_id IN (
    SELECT get_managed_property_ids(auth.uid())
  )
));