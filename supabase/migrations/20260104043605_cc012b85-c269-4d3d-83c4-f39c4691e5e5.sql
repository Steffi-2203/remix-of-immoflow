-- The issue is that all policies were created as RESTRICTIVE (the default when not specified)
-- They should be PERMISSIVE for proper "allow" behavior

-- Fix properties policies
DROP POLICY IF EXISTS "Managers can view their properties or unassigned ones" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can create properties" ON public.properties;
DROP POLICY IF EXISTS "Managers can update their properties" ON public.properties;
DROP POLICY IF EXISTS "Managers can delete their properties" ON public.properties;

CREATE POLICY "Managers can view their properties or unassigned ones"
    ON public.properties FOR SELECT TO authenticated
    USING (public.is_property_manager(auth.uid(), id) OR public.is_property_unassigned(id));

CREATE POLICY "Authenticated users can create properties"
    ON public.properties FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can update their properties"
    ON public.properties FOR UPDATE TO authenticated
    USING (public.is_property_manager(auth.uid(), id));

CREATE POLICY "Managers can delete their properties"
    ON public.properties FOR DELETE TO authenticated
    USING (public.is_property_manager(auth.uid(), id));

-- Fix units policies
DROP POLICY IF EXISTS "Managers can view units in their properties" ON public.units;
DROP POLICY IF EXISTS "Managers can create units in their properties" ON public.units;
DROP POLICY IF EXISTS "Managers can update units in their properties" ON public.units;
DROP POLICY IF EXISTS "Managers can delete units in their properties" ON public.units;

CREATE POLICY "Managers can view units in their properties"
    ON public.units FOR SELECT TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create units in their properties"
    ON public.units FOR INSERT TO authenticated
    WITH CHECK (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update units in their properties"
    ON public.units FOR UPDATE TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete units in their properties"
    ON public.units FOR DELETE TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

-- Fix tenants policies
DROP POLICY IF EXISTS "Managers can view tenants in their properties" ON public.tenants;
DROP POLICY IF EXISTS "Managers can create tenants in their properties" ON public.tenants;
DROP POLICY IF EXISTS "Managers can update tenants in their properties" ON public.tenants;

CREATE POLICY "Managers can view tenants in their properties"
    ON public.tenants FOR SELECT TO authenticated
    USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can create tenants in their properties"
    ON public.tenants FOR INSERT TO authenticated
    WITH CHECK (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can update tenants in their properties"
    ON public.tenants FOR UPDATE TO authenticated
    USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

-- Fix monthly_invoices policies
DROP POLICY IF EXISTS "Managers can view invoices for their properties" ON public.monthly_invoices;
DROP POLICY IF EXISTS "Managers can create invoices for their properties" ON public.monthly_invoices;
DROP POLICY IF EXISTS "Managers can update invoices for their properties" ON public.monthly_invoices;
DROP POLICY IF EXISTS "Managers can delete invoices for their properties" ON public.monthly_invoices;

CREATE POLICY "Managers can view invoices for their properties"
    ON public.monthly_invoices FOR SELECT TO authenticated
    USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can create invoices for their properties"
    ON public.monthly_invoices FOR INSERT TO authenticated
    WITH CHECK (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can update invoices for their properties"
    ON public.monthly_invoices FOR UPDATE TO authenticated
    USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can delete invoices for their properties"
    ON public.monthly_invoices FOR DELETE TO authenticated
    USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

-- Fix payments policies
DROP POLICY IF EXISTS "Managers can view payments for their properties" ON public.payments;
DROP POLICY IF EXISTS "Managers can create payments for their properties" ON public.payments;
DROP POLICY IF EXISTS "Managers can update payments for their properties" ON public.payments;
DROP POLICY IF EXISTS "Managers can delete payments for their properties" ON public.payments;

CREATE POLICY "Managers can view payments for their properties"
    ON public.payments FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id = u.id WHERE u.property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can create payments for their properties"
    ON public.payments FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id = u.id WHERE u.property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can update payments for their properties"
    ON public.payments FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id = u.id WHERE u.property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can delete payments for their properties"
    ON public.payments FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id = u.id WHERE u.property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

-- Fix expenses policies
DROP POLICY IF EXISTS "Managers can view expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Managers can create expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Managers can update expenses for their properties" ON public.expenses;
DROP POLICY IF EXISTS "Managers can delete expenses for their properties" ON public.expenses;

CREATE POLICY "Managers can view expenses for their properties"
    ON public.expenses FOR SELECT TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create expenses for their properties"
    ON public.expenses FOR INSERT TO authenticated
    WITH CHECK (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update expenses for their properties"
    ON public.expenses FOR UPDATE TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete expenses for their properties"
    ON public.expenses FOR DELETE TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

-- Fix operating_cost_settlements policies
DROP POLICY IF EXISTS "Managers can view settlements for their properties" ON public.operating_cost_settlements;
DROP POLICY IF EXISTS "Managers can create settlements for their properties" ON public.operating_cost_settlements;
DROP POLICY IF EXISTS "Managers can update settlements for their properties" ON public.operating_cost_settlements;
DROP POLICY IF EXISTS "Managers can delete settlements for their properties" ON public.operating_cost_settlements;

CREATE POLICY "Managers can view settlements for their properties"
    ON public.operating_cost_settlements FOR SELECT TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create settlements for their properties"
    ON public.operating_cost_settlements FOR INSERT TO authenticated
    WITH CHECK (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update settlements for their properties"
    ON public.operating_cost_settlements FOR UPDATE TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete settlements for their properties"
    ON public.operating_cost_settlements FOR DELETE TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

-- Fix settlement_items policies
DROP POLICY IF EXISTS "Managers can view settlement items for their properties" ON public.settlement_items;
DROP POLICY IF EXISTS "Managers can create settlement items for their properties" ON public.settlement_items;
DROP POLICY IF EXISTS "Managers can update settlement items for their properties" ON public.settlement_items;
DROP POLICY IF EXISTS "Managers can delete settlement items for their properties" ON public.settlement_items;

CREATE POLICY "Managers can view settlement items for their properties"
    ON public.settlement_items FOR SELECT TO authenticated
    USING (settlement_id IN (SELECT id FROM public.operating_cost_settlements WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can create settlement items for their properties"
    ON public.settlement_items FOR INSERT TO authenticated
    WITH CHECK (settlement_id IN (SELECT id FROM public.operating_cost_settlements WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can update settlement items for their properties"
    ON public.settlement_items FOR UPDATE TO authenticated
    USING (settlement_id IN (SELECT id FROM public.operating_cost_settlements WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can delete settlement items for their properties"
    ON public.settlement_items FOR DELETE TO authenticated
    USING (settlement_id IN (SELECT id FROM public.operating_cost_settlements WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

-- Fix property_documents policies
DROP POLICY IF EXISTS "Managers can view documents for their properties" ON public.property_documents;
DROP POLICY IF EXISTS "Managers can create documents for their properties" ON public.property_documents;
DROP POLICY IF EXISTS "Managers can update documents for their properties" ON public.property_documents;
DROP POLICY IF EXISTS "Managers can delete documents for their properties" ON public.property_documents;

CREATE POLICY "Managers can view documents for their properties"
    ON public.property_documents FOR SELECT TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create documents for their properties"
    ON public.property_documents FOR INSERT TO authenticated
    WITH CHECK (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update documents for their properties"
    ON public.property_documents FOR UPDATE TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete documents for their properties"
    ON public.property_documents FOR DELETE TO authenticated
    USING (property_id IN (SELECT public.get_managed_property_ids(auth.uid())));

-- Fix unit_documents policies
DROP POLICY IF EXISTS "Managers can view unit documents for their properties" ON public.unit_documents;
DROP POLICY IF EXISTS "Managers can create unit documents for their properties" ON public.unit_documents;
DROP POLICY IF EXISTS "Managers can update unit documents for their properties" ON public.unit_documents;
DROP POLICY IF EXISTS "Managers can delete unit documents for their properties" ON public.unit_documents;

CREATE POLICY "Managers can view unit documents for their properties"
    ON public.unit_documents FOR SELECT TO authenticated
    USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can create unit documents for their properties"
    ON public.unit_documents FOR INSERT TO authenticated
    WITH CHECK (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can update unit documents for their properties"
    ON public.unit_documents FOR UPDATE TO authenticated
    USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

CREATE POLICY "Managers can delete unit documents for their properties"
    ON public.unit_documents FOR DELETE TO authenticated
    USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_managed_property_ids(auth.uid()))));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Fix property_managers policies
DROP POLICY IF EXISTS "Users can view own property assignments" ON public.property_managers;
DROP POLICY IF EXISTS "Authenticated users can claim properties" ON public.property_managers;
DROP POLICY IF EXISTS "Users can delete own property assignments" ON public.property_managers;

CREATE POLICY "Users can view own property assignments"
    ON public.property_managers FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can claim properties"
    ON public.property_managers FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND public.is_property_unassigned(property_id));

CREATE POLICY "Users can delete own property assignments"
    ON public.property_managers FOR DELETE TO authenticated
    USING (auth.uid() = user_id);