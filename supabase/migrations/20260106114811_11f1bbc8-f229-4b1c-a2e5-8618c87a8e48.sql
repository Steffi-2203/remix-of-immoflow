-- Update handle_new_user() to set subscription_status to 'active' instead of 'trial'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  company_name TEXT;
BEGIN
  -- Get company name from metadata, default to user's name + " Hausverwaltung"
  company_name := COALESCE(
    NEW.raw_user_meta_data ->> 'company_name',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Meine') || ' Hausverwaltung'
  );
  
  -- Create the organization with active status (no trial)
  INSERT INTO public.organizations (name, subscription_tier, subscription_status, trial_ends_at)
  VALUES (company_name, 'enterprise', 'active', NULL)
  RETURNING id INTO new_org_id;
  
  -- Create the profile with organization reference
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', new_org_id);
  
  -- Assign default role of property_manager
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'property_manager');
  
  RETURN NEW;
END;
$function$;