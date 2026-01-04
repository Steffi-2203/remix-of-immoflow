-- Update handle_new_user to set trial_ends_at to 14 days from now
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
  
  -- Create the organization with 14-day trial
  INSERT INTO public.organizations (name, subscription_tier, subscription_status, trial_ends_at)
  VALUES (company_name, 'starter', 'trial', now() + interval '14 days')
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