-- 1. RLS Policy für profiles: Org-Admins können alle Profile ihrer Organisation sehen
CREATE POLICY "org_admins_can_view_org_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (
  organization_id IS NOT NULL 
  AND public.is_org_admin(auth.uid(), organization_id)
);

-- 2. RLS Policies für user_roles: Org-Admins können Rollen ihrer Org-Benutzer verwalten

-- SELECT: Org-Admin kann Rollen sehen
CREATE POLICY "org_admins_view_org_roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles target_user
    JOIN public.profiles admin_user ON admin_user.id = auth.uid()
    WHERE target_user.id = user_roles.user_id
      AND target_user.organization_id = admin_user.organization_id
      AND target_user.organization_id IS NOT NULL
      AND public.is_org_admin(auth.uid(), admin_user.organization_id)
  )
);

-- INSERT: Org-Admin kann Rollen vergeben
CREATE POLICY "org_admins_insert_org_roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles target_user
    JOIN public.profiles admin_user ON admin_user.id = auth.uid()
    WHERE target_user.id = user_roles.user_id
      AND target_user.organization_id = admin_user.organization_id
      AND target_user.organization_id IS NOT NULL
      AND public.is_org_admin(auth.uid(), admin_user.organization_id)
  )
);

-- UPDATE: Org-Admin kann Rollen ändern
CREATE POLICY "org_admins_update_org_roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles target_user
    JOIN public.profiles admin_user ON admin_user.id = auth.uid()
    WHERE target_user.id = user_roles.user_id
      AND target_user.organization_id = admin_user.organization_id
      AND target_user.organization_id IS NOT NULL
      AND public.is_org_admin(auth.uid(), admin_user.organization_id)
  )
);

-- DELETE: Org-Admin kann Rollen entfernen
CREATE POLICY "org_admins_delete_org_roles" ON public.user_roles
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles target_user
    JOIN public.profiles admin_user ON admin_user.id = auth.uid()
    WHERE target_user.id = user_roles.user_id
      AND target_user.organization_id = admin_user.organization_id
      AND target_user.organization_id IS NOT NULL
      AND public.is_org_admin(auth.uid(), admin_user.organization_id)
  )
);

-- 3. Signup-Trigger aktualisieren: Bei Invite-Registrierung keine neue Organisation anlegen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  company_name TEXT;
  invite_token_value TEXT;
BEGIN
  -- Check if this is an invite-based signup
  invite_token_value := NEW.raw_user_meta_data ->> 'invite_token';
  
  IF invite_token_value IS NOT NULL AND invite_token_value != '' THEN
    -- Invite-based signup: Don't create organization, just create profile
    -- The invite acceptance flow will set organization_id and role
    INSERT INTO public.profiles (id, email, full_name, organization_id)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', NULL);
    
    -- No role assigned - will be set by invite acceptance
  ELSE
    -- Normal signup: Create organization and assign admin role
    company_name := COALESCE(
      NEW.raw_user_meta_data ->> 'company_name',
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Meine') || ' Hausverwaltung'
    );
    
    -- Create the organization with active status
    INSERT INTO public.organizations (name, subscription_tier, subscription_status, trial_ends_at)
    VALUES (company_name, 'enterprise', 'active', NULL)
    RETURNING id INTO new_org_id;
    
    -- Create the profile with organization reference
    INSERT INTO public.profiles (id, email, full_name, organization_id)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', new_org_id);
    
    -- Assign admin role for first user of new organization
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$function$;