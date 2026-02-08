
CREATE TABLE IF NOT EXISTS public.water_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  reading_date date NOT NULL,
  consumption numeric(12,3) NOT NULL DEFAULT 0,
  coefficient numeric(8,4) DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS water_readings_unit_date_unique ON public.water_readings(unit_id, reading_date);

ALTER TABLE public.water_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view water readings in their org"
ON public.water_readings FOR SELECT
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can insert water readings in their org"
ON public.water_readings FOR INSERT
WITH CHECK (organization_id = public.user_org_id());

CREATE POLICY "Users can update water readings in their org"
ON public.water_readings FOR UPDATE
USING (organization_id = public.user_org_id());

CREATE POLICY "Users can delete water readings in their org"
ON public.water_readings FOR DELETE
USING (organization_id = public.user_org_id());

CREATE TRIGGER trg_water_readings_updated_at
BEFORE UPDATE ON public.water_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
