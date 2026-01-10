-- Create organization_invites table for user invitation system
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check if user is admin of an organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = _user_id
      AND p.organization_id = _org_id
      AND ur.role = 'admin'
  )
$$;

-- Policy: Admins of the organization can manage invites
CREATE POLICY "org_admins_manage_invites" ON public.organization_invites
FOR ALL TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

-- Policy: Anyone can read valid invites by token (for registration)
CREATE POLICY "read_valid_invites" ON public.organization_invites
FOR SELECT TO anon, authenticated
USING (
  accepted_at IS NULL
  AND expires_at > now()
);

-- Create index for faster token lookups
CREATE INDEX idx_organization_invites_token ON public.organization_invites(token);

-- Create index for faster organization lookups
CREATE INDEX idx_organization_invites_org_id ON public.organization_invites(organization_id);