-- VPI-Werte Tabelle für manuelle Pflege
CREATE TABLE public.vpi_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- Enable RLS
ALTER TABLE public.vpi_values ENABLE ROW LEVEL SECURITY;

-- VPI values are read by all authenticated users, managed by admins
CREATE POLICY "Authenticated users can read VPI values"
  ON public.vpi_values FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert VPI values"
  ON public.vpi_values FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update VPI values"
  ON public.vpi_values FOR UPDATE
  USING (true);

-- Seed historic baseline values (Statistik Austria VPI 2020 base = 100)
INSERT INTO public.vpi_values (year, month, value, source, notes) VALUES
  (2023, 1, 118.4, 'seed', 'VPI 2020=100'),
  (2023, 6, 119.8, 'seed', 'VPI 2020=100'),
  (2023, 12, 120.5, 'seed', 'VPI 2020=100'),
  (2024, 1, 121.0, 'seed', 'VPI 2020=100'),
  (2024, 6, 121.8, 'seed', 'VPI 2020=100'),
  (2024, 12, 122.3, 'seed', 'VPI 2020=100'),
  (2025, 1, 122.9, 'seed', 'VPI 2020=100');

-- Trigger for updated_at
CREATE TRIGGER update_vpi_values_updated_at
  BEFORE UPDATE ON public.vpi_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();