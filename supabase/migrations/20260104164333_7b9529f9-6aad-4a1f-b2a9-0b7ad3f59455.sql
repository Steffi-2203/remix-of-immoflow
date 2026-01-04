-- Add 'admin' to the app_role enum if not exists
-- Note: The enum already includes 'admin' based on the types file

-- Create a helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Create RLS policies for admin access to organizations (view all)
CREATE POLICY "Admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create RLS policies for admin access to profiles (view all)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create RLS policy for admins to update organizations
CREATE POLICY "Admins can update all organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create RLS policies for admin access to user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create RLS policies for admin access to properties
CREATE POLICY "Admins can view all properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create RLS policies for admin access to units
CREATE POLICY "Admins can view all units"
ON public.units
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create RLS policies for admin access to property_managers
CREATE POLICY "Admins can view all property managers"
ON public.property_managers
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));