-- Create transactions table for bank imports
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  transaction_date DATE NOT NULL,
  booking_date DATE,
  description TEXT,
  reference TEXT,
  counterpart_name TEXT,
  counterpart_iban TEXT,
  status TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('matched', 'unmatched', 'ignored')),
  match_confidence NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only see transactions from their organization
CREATE POLICY "Users can view transactions from their organization"
ON public.transactions
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create transactions for their organization"
ON public.transactions
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update transactions from their organization"
ON public.transactions
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete transactions from their organization"
ON public.transactions
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create learned_matches table for storing user-confirmed matches (for Phase 2)
CREATE TABLE public.learned_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  match_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for learned_matches
ALTER TABLE public.learned_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view learned matches from their organization"
ON public.learned_matches FOR SELECT
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create learned matches for their organization"
ON public.learned_matches FOR INSERT
WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update learned matches from their organization"
ON public.learned_matches FOR UPDATE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete learned matches from their organization"
ON public.learned_matches FOR DELETE
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));