-- Fix RLS Policy: Remove public exposure of unassigned properties
-- Only property managers and admins should see properties

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Managers can view their properties or unassigned ones" ON public.properties;

-- Create a more restrictive policy: managers can ONLY see their assigned properties
CREATE POLICY "Managers can view their assigned properties"
ON public.properties
FOR SELECT
USING (is_property_manager(auth.uid(), id));

-- Update the INSERT policy to automatically allow viewing after creation
-- The workflow is: create property -> immediately assign as manager -> can view
-- This is handled by the application code in useCreateProperty hook