-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('starter', 'professional', 'enterprise');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'cancelled', 'expired');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subscription_tier public.subscription_tier NOT NULL DEFAULT 'starter',
  subscription_status public.subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Create trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own organization"
ON public.organizations
FOR UPDATE
USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Update the handle_new_user function to create organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  company_name TEXT;
BEGIN
  -- Get company name from metadata, default to user's name + " Hausverwaltung"
  company_name := COALESCE(
    NEW.raw_user_meta_data ->> 'company_name',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Meine') || ' Hausverwaltung'
  );
  
  -- Create the organization first
  INSERT INTO public.organizations (name, subscription_tier, subscription_status)
  VALUES (company_name, 'starter', 'trial')
  RETURNING id INTO new_org_id;
  
  -- Create the profile with organization reference
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', new_org_id);
  
  -- Assign default role of property_manager
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'property_manager');
  
  RETURN NEW;
END;
$$;