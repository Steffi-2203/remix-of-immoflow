-- Create unit_distribution_values table to store unit-specific distribution key values
CREATE TABLE public.unit_distribution_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  distribution_key_id UUID NOT NULL REFERENCES public.distribution_keys(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, distribution_key_id)
);

-- Enable RLS
ALTER TABLE public.unit_distribution_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Access based on unit's property manager
CREATE POLICY "Managers can view unit distribution values for their properties"
ON public.unit_distribution_values
FOR SELECT
USING (unit_id IN (
  SELECT units.id FROM units 
  WHERE units.property_id IN (SELECT get_managed_property_ids(auth.uid()))
));

CREATE POLICY "Managers can create unit distribution values for their properties"
ON public.unit_distribution_values
FOR INSERT
WITH CHECK (unit_id IN (
  SELECT units.id FROM units 
  WHERE units.property_id IN (SELECT get_managed_property_ids(auth.uid()))
));

CREATE POLICY "Managers can update unit distribution values for their properties"
ON public.unit_distribution_values
FOR UPDATE
USING (unit_id IN (
  SELECT units.id FROM units 
  WHERE units.property_id IN (SELECT get_managed_property_ids(auth.uid()))
));

CREATE POLICY "Managers can delete unit distribution values for their properties"
ON public.unit_distribution_values
FOR DELETE
USING (unit_id IN (
  SELECT units.id FROM units 
  WHERE units.property_id IN (SELECT get_managed_property_ids(auth.uid()))
));

-- Trigger for updated_at
CREATE TRIGGER update_unit_distribution_values_updated_at
BEFORE UPDATE ON public.unit_distribution_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();