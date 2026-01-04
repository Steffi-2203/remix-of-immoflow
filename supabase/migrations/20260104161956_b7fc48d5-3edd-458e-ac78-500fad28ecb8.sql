-- Drop existing foreign key constraints and recreate with CASCADE

-- Units -> Properties
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_property_id_fkey;
ALTER TABLE public.units ADD CONSTRAINT units_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Tenants -> Units
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_unit_id_fkey;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_unit_id_fkey 
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- Settlement Items -> Units
ALTER TABLE public.settlement_items DROP CONSTRAINT IF EXISTS settlement_items_unit_id_fkey;
ALTER TABLE public.settlement_items ADD CONSTRAINT settlement_items_unit_id_fkey 
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- Settlement Items -> Settlements
ALTER TABLE public.settlement_items DROP CONSTRAINT IF EXISTS settlement_items_settlement_id_fkey;
ALTER TABLE public.settlement_items ADD CONSTRAINT settlement_items_settlement_id_fkey 
  FOREIGN KEY (settlement_id) REFERENCES public.operating_cost_settlements(id) ON DELETE CASCADE;

-- Settlement Items -> Tenants (nullable, so SET NULL on delete)
ALTER TABLE public.settlement_items DROP CONSTRAINT IF EXISTS settlement_items_tenant_id_fkey;
ALTER TABLE public.settlement_items ADD CONSTRAINT settlement_items_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Monthly Invoices -> Units
ALTER TABLE public.monthly_invoices DROP CONSTRAINT IF EXISTS monthly_invoices_unit_id_fkey;
ALTER TABLE public.monthly_invoices ADD CONSTRAINT monthly_invoices_unit_id_fkey 
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- Monthly Invoices -> Tenants
ALTER TABLE public.monthly_invoices DROP CONSTRAINT IF EXISTS monthly_invoices_tenant_id_fkey;
ALTER TABLE public.monthly_invoices ADD CONSTRAINT monthly_invoices_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Expenses -> Properties
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_property_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Property Documents -> Properties
ALTER TABLE public.property_documents DROP CONSTRAINT IF EXISTS property_documents_property_id_fkey;
ALTER TABLE public.property_documents ADD CONSTRAINT property_documents_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Property Managers -> Properties
ALTER TABLE public.property_managers DROP CONSTRAINT IF EXISTS property_managers_property_id_fkey;
ALTER TABLE public.property_managers ADD CONSTRAINT property_managers_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Operating Cost Settlements -> Properties
ALTER TABLE public.operating_cost_settlements DROP CONSTRAINT IF EXISTS operating_cost_settlements_property_id_fkey;
ALTER TABLE public.operating_cost_settlements ADD CONSTRAINT operating_cost_settlements_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Unit Documents -> Units
ALTER TABLE public.unit_documents DROP CONSTRAINT IF EXISTS unit_documents_unit_id_fkey;
ALTER TABLE public.unit_documents ADD CONSTRAINT unit_documents_unit_id_fkey 
  FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;

-- Payments -> Tenants
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Payments -> Invoices (nullable, so SET NULL on delete)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES public.monthly_invoices(id) ON DELETE SET NULL;