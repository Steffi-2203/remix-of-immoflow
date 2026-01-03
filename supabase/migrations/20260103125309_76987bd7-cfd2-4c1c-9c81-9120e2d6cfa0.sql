-- Create expense categories enum
CREATE TYPE public.expense_category AS ENUM (
  'betriebskosten_umlagefaehig',
  'instandhaltung'
);

-- Create expense type enum for common cost types
CREATE TYPE public.expense_type AS ENUM (
  'versicherung',
  'grundsteuer',
  'muellabfuhr',
  'wasser_abwasser',
  'heizung',
  'strom_allgemein',
  'hausbetreuung',
  'lift',
  'gartenpflege',
  'schneeraeumung',
  'verwaltung',
  'ruecklage',
  'reparatur',
  'sanierung',
  'sonstiges'
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  expense_type expense_type NOT NULL DEFAULT 'sonstiges',
  bezeichnung TEXT NOT NULL,
  betrag NUMERIC NOT NULL DEFAULT 0,
  datum DATE NOT NULL,
  beleg_nummer TEXT,
  notizen TEXT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policy for all access
CREATE POLICY "Allow all access to expenses"
ON public.expenses
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_expenses_property_year ON public.expenses(property_id, year);
CREATE INDEX idx_expenses_category ON public.expenses(category);