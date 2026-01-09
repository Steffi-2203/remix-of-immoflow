-- Create property_owners table for managing property owners with shares
CREATE TABLE public.property_owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  
  -- Basic data
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  
  -- Bank data
  iban TEXT,
  bic TEXT,
  
  -- Ownership
  ownership_share NUMERIC NOT NULL DEFAULT 100 CHECK (ownership_share > 0 AND ownership_share <= 100),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_owners ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Access based on property manager
CREATE POLICY "Managers can view owners for their properties"
ON public.property_owners
FOR SELECT
USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can create owners for their properties"
ON public.property_owners
FOR INSERT
WITH CHECK (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can update owners for their properties"
ON public.property_owners
FOR UPDATE
USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

CREATE POLICY "Managers can delete owners for their properties"
ON public.property_owners
FOR DELETE
USING (property_id IN (SELECT get_managed_property_ids(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_property_owners_updated_at
BEFORE UPDATE ON public.property_owners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_property_owners_property_id ON public.property_owners(property_id);