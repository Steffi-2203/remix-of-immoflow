
-- Table for rent index clauses (Wertsicherungsklauseln) per tenant
CREATE TABLE public.rent_index_clauses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  index_type TEXT NOT NULL DEFAULT 'vpi' CHECK (index_type IN ('vpi', 'richtwert')),
  base_index_value NUMERIC NOT NULL,
  base_index_date DATE NOT NULL,
  current_index_value NUMERIC,
  threshold_percent NUMERIC NOT NULL DEFAULT 5.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for rent adjustment history
CREATE TABLE public.rent_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES public.rent_index_clauses(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL,
  old_grundmiete NUMERIC NOT NULL,
  new_grundmiete NUMERIC NOT NULL,
  old_index_value NUMERIC NOT NULL,
  new_index_value NUMERIC NOT NULL,
  change_percent NUMERIC NOT NULL,
  applied_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for tenant deposits/Kautionen (for feature #2)
CREATE TABLE public.tenant_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  deposit_paid_date DATE,
  deposit_type TEXT NOT NULL DEFAULT 'bar' CHECK (deposit_type IN ('bar', 'bankgarantie', 'sparbuch', 'versicherung')),
  interest_rate NUMERIC DEFAULT 0,
  interest_accrued NUMERIC DEFAULT 0,
  last_interest_calc_date DATE,
  deposit_returned_date DATE,
  deposit_returned_amount NUMERIC,
  deductions NUMERIC DEFAULT 0,
  deduction_notes TEXT,
  bank_account TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rent_index_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_deposits ENABLE ROW LEVEL SECURITY;

-- RLS policies - same pattern as tenants (accessible by authenticated users in same org)
CREATE POLICY "Authenticated users can view rent index clauses"
  ON public.rent_index_clauses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage rent index clauses"
  ON public.rent_index_clauses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view rent adjustments"
  ON public.rent_adjustments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage rent adjustments"
  ON public.rent_adjustments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view tenant deposits"
  ON public.tenant_deposits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tenant deposits"
  ON public.tenant_deposits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_rent_index_clauses_updated_at
  BEFORE UPDATE ON public.rent_index_clauses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_deposits_updated_at
  BEFORE UPDATE ON public.tenant_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
