-- Temporarily allow authenticated users to view all unassigned properties
-- This is needed so they can claim properties that have no manager

-- Create a function to check if a property is unassigned
CREATE OR REPLACE FUNCTION public.is_property_unassigned(_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.property_managers
        WHERE property_id = _property_id
    )
$$;

-- Update the SELECT policy on properties to also allow viewing unassigned properties
DROP POLICY IF EXISTS "Managers can view their properties" ON public.properties;
CREATE POLICY "Managers can view their properties or unassigned ones"
    ON public.properties FOR SELECT
    USING (
        public.is_property_manager(auth.uid(), id) 
        OR public.is_property_unassigned(id)
    );

-- Allow authenticated users to claim unassigned properties
-- by creating property_manager entries for them
DROP POLICY IF EXISTS "Authenticated users can create property assignments for self" ON public.property_managers;
CREATE POLICY "Authenticated users can claim properties"
    ON public.property_managers FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND public.is_property_unassigned(property_id)
    );