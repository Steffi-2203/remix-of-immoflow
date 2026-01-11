-- Create contractors table for tradesmen database
CREATE TABLE public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  specializations TEXT[] DEFAULT '{}',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  iban TEXT,
  bic TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view contractors in their organization"
ON public.contractors FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert contractors in their organization"
ON public.contractors FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update contractors in their organization"
ON public.contractors FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete contractors in their organization"
ON public.contractors FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_contractors_updated_at
BEFORE UPDATE ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();