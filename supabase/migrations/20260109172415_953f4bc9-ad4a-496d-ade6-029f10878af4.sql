-- Create table for custom distribution key definitions
CREATE TABLE public.distribution_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id),
  key_code text NOT NULL, -- e.g. 'vs_qm', 'vs_mea', 'vs_custom_1'
  name text NOT NULL, -- Display name e.g. 'Quadratmeter'
  unit text NOT NULL DEFAULT 'Anteil', -- e.g. 'm²', '‰', 'Pers.', 'kWh', 'Anteil'
  input_type text NOT NULL DEFAULT 'direkteingabe', -- 'anzahl', 'direkteingabe', 'promille', 'qm', 'mea', 'personen'
  description text, -- Optional description
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false, -- System keys cannot be deleted
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, key_code)
);

-- Enable RLS
ALTER TABLE public.distribution_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view distribution keys in their org"
ON public.distribution_keys
FOR SELECT
USING (
  organization_id IN (
    SELECT profiles.organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can insert distribution keys in their org"
ON public.distribution_keys
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT profiles.organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can update distribution keys in their org"
ON public.distribution_keys
FOR UPDATE
USING (
  organization_id IN (
    SELECT profiles.organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can delete non-system distribution keys in their org"
ON public.distribution_keys
FOR DELETE
USING (
  organization_id IN (
    SELECT profiles.organization_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  ) AND is_system = false
);

-- Create updated_at trigger
CREATE TRIGGER update_distribution_keys_updated_at
BEFORE UPDATE ON public.distribution_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();