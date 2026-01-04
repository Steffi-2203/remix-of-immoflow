-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'property_manager');

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create property_managers table to link users to properties
CREATE TABLE public.property_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, property_id)
);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_managers ENABLE ROW LEVEL SECURITY;

-- Create trigger for profiles on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
    
    -- Assign default role of property_manager
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'property_manager');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Security definer function to check if user manages a property
CREATE OR REPLACE FUNCTION public.is_property_manager(_user_id UUID, _property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.property_managers
        WHERE user_id = _user_id
          AND property_id = _property_id
    )
$$;

-- Security definer function to get user's managed property IDs
CREATE OR REPLACE FUNCTION public.get_managed_property_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT property_id
    FROM public.property_managers
    WHERE user_id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for user_roles (read-only for users, admin can manage)
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for property_managers
CREATE POLICY "Users can view own property assignments"
    ON public.property_managers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create property assignments for self"
    ON public.property_managers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own property assignments"
    ON public.property_managers FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- Replace ALL permissive policies with proper auth-based ones
-- =====================================================

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Allow all access to properties" ON public.properties;
DROP POLICY IF EXISTS "Allow all access to units" ON public.units;
DROP POLICY IF EXISTS "Allow all access to tenants" ON public.tenants;
DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all access to property_documents" ON public.property_documents;
DROP POLICY IF EXISTS "Allow all access to unit_documents" ON public.unit_documents;
DROP POLICY IF EXISTS "Allow all access to monthly_invoices" ON public.monthly_invoices;
DROP POLICY IF EXISTS "Allow all access to operating_cost_settlements" ON public.operating_cost_settlements;
DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all access to settlement_items" ON public.settlement_items;

-- Properties: Only managers can access their properties
CREATE POLICY "Managers can view their properties"
    ON public.properties FOR SELECT
    USING (public.is_property_manager(auth.uid(), id));

CREATE POLICY "Authenticated users can create properties"
    ON public.properties FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update their properties"
    ON public.properties FOR UPDATE
    USING (public.is_property_manager(auth.uid(), id));

CREATE POLICY "Managers can delete their properties"
    ON public.properties FOR DELETE
    USING (public.is_property_manager(auth.uid(), id));

-- Units: Access through property ownership
CREATE POLICY "Managers can view units in their properties"
    ON public.units FOR SELECT
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create units in their properties"
    ON public.units FOR INSERT
    WITH CHECK (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update units in their properties"
    ON public.units FOR UPDATE
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete units in their properties"
    ON public.units FOR DELETE
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

-- Tenants: Access through unit's property ownership
CREATE POLICY "Managers can view tenants in their properties"
    ON public.tenants FOR SELECT
    USING (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can create tenants in their properties"
    ON public.tenants FOR INSERT
    WITH CHECK (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can update tenants in their properties"
    ON public.tenants FOR UPDATE
    USING (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

-- Expenses: Access through property ownership
CREATE POLICY "Managers can view expenses for their properties"
    ON public.expenses FOR SELECT
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create expenses for their properties"
    ON public.expenses FOR INSERT
    WITH CHECK (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update expenses for their properties"
    ON public.expenses FOR UPDATE
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete expenses for their properties"
    ON public.expenses FOR DELETE
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

-- Monthly Invoices: Access through unit's property ownership
CREATE POLICY "Managers can view invoices for their properties"
    ON public.monthly_invoices FOR SELECT
    USING (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can create invoices for their properties"
    ON public.monthly_invoices FOR INSERT
    WITH CHECK (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can update invoices for their properties"
    ON public.monthly_invoices FOR UPDATE
    USING (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can delete invoices for their properties"
    ON public.monthly_invoices FOR DELETE
    USING (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

-- Payments: Access through tenant's unit's property ownership
CREATE POLICY "Managers can view payments for their properties"
    ON public.payments FOR SELECT
    USING (tenant_id IN (
        SELECT t.id FROM public.tenants t
        JOIN public.units u ON t.unit_id = u.id
        WHERE u.property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can create payments for their properties"
    ON public.payments FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT t.id FROM public.tenants t
        JOIN public.units u ON t.unit_id = u.id
        WHERE u.property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can update payments for their properties"
    ON public.payments FOR UPDATE
    USING (tenant_id IN (
        SELECT t.id FROM public.tenants t
        JOIN public.units u ON t.unit_id = u.id
        WHERE u.property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can delete payments for their properties"
    ON public.payments FOR DELETE
    USING (tenant_id IN (
        SELECT t.id FROM public.tenants t
        JOIN public.units u ON t.unit_id = u.id
        WHERE u.property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

-- Property Documents: Access through property ownership
CREATE POLICY "Managers can view documents for their properties"
    ON public.property_documents FOR SELECT
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create documents for their properties"
    ON public.property_documents FOR INSERT
    WITH CHECK (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update documents for their properties"
    ON public.property_documents FOR UPDATE
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete documents for their properties"
    ON public.property_documents FOR DELETE
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

-- Unit Documents: Access through unit's property ownership
CREATE POLICY "Managers can view unit documents for their properties"
    ON public.unit_documents FOR SELECT
    USING (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can create unit documents for their properties"
    ON public.unit_documents FOR INSERT
    WITH CHECK (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can update unit documents for their properties"
    ON public.unit_documents FOR UPDATE
    USING (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can delete unit documents for their properties"
    ON public.unit_documents FOR DELETE
    USING (unit_id IN (
        SELECT id FROM public.units 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

-- Operating Cost Settlements: Access through property ownership
CREATE POLICY "Managers can view settlements for their properties"
    ON public.operating_cost_settlements FOR SELECT
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create settlements for their properties"
    ON public.operating_cost_settlements FOR INSERT
    WITH CHECK (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update settlements for their properties"
    ON public.operating_cost_settlements FOR UPDATE
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete settlements for their properties"
    ON public.operating_cost_settlements FOR DELETE
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

-- Settlement Items: Access through settlement's property ownership
CREATE POLICY "Managers can view settlement items for their properties"
    ON public.settlement_items FOR SELECT
    USING (settlement_id IN (
        SELECT id FROM public.operating_cost_settlements 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can create settlement items for their properties"
    ON public.settlement_items FOR INSERT
    WITH CHECK (settlement_id IN (
        SELECT id FROM public.operating_cost_settlements 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can update settlement items for their properties"
    ON public.settlement_items FOR UPDATE
    USING (settlement_id IN (
        SELECT id FROM public.operating_cost_settlements 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

CREATE POLICY "Managers can delete settlement items for their properties"
    ON public.settlement_items FOR DELETE
    USING (settlement_id IN (
        SELECT id FROM public.operating_cost_settlements 
        WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))
    ));

-- =====================================================
-- Fix Storage Bucket - Make private and update policies
-- =====================================================

-- Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'expense-receipts';

-- Drop existing public access policy if it exists
DROP POLICY IF EXISTS "Allow public read access to expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete expense receipts" ON storage.objects;

-- Create proper authenticated policies for storage
CREATE POLICY "Authenticated users can upload files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'expense-receipts' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Authenticated users can view files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'expense-receipts' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Authenticated users can update files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'expense-receipts' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Authenticated users can delete files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'expense-receipts' 
        AND auth.uid() IS NOT NULL
    );