-- Create maintenance_contracts table for recurring maintenance
CREATE TABLE public.maintenance_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Contract details
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  
  -- Contractor info
  contractor_name TEXT,
  contractor_contact TEXT,
  contractor_email TEXT,
  
  -- Interval & dates
  interval_months INTEGER NOT NULL DEFAULT 12,
  last_maintenance_date DATE,
  next_due_date DATE NOT NULL,
  reminder_days INTEGER NOT NULL DEFAULT 30,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Costs
  estimated_cost NUMERIC(12,2),
  contract_fee NUMERIC(12,2),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  document_url TEXT,
  notes TEXT,
  
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - based on property_managers pattern
CREATE POLICY "Managers can view contracts for their properties"
  ON public.maintenance_contracts FOR SELECT
  USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create contracts for their properties"
  ON public.maintenance_contracts FOR INSERT
  WITH CHECK (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update contracts for their properties"
  ON public.maintenance_contracts FOR UPDATE
  USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete contracts for their properties"
  ON public.maintenance_contracts FOR DELETE
  USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_contracts_updated_at
  BEFORE UPDATE ON public.maintenance_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_maintenance_contracts_property_id ON public.maintenance_contracts(property_id);
CREATE INDEX idx_maintenance_contracts_next_due_date ON public.maintenance_contracts(next_due_date);
CREATE INDEX idx_maintenance_contracts_is_active ON public.maintenance_contracts(is_active);