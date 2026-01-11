-- Create property_budgets table for annual budget planning
CREATE TABLE public.property_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  year INTEGER NOT NULL,
  
  -- 5 manually describable budget positions
  position_1_name TEXT,
  position_1_amount NUMERIC DEFAULT 0,
  position_2_name TEXT,
  position_2_amount NUMERIC DEFAULT 0,
  position_3_name TEXT,
  position_3_amount NUMERIC DEFAULT 0,
  position_4_name TEXT,
  position_4_amount NUMERIC DEFAULT 0,
  position_5_name TEXT,
  position_5_amount NUMERIC DEFAULT 0,
  
  -- Approval workflow
  status TEXT DEFAULT 'entwurf' CHECK (status IN ('entwurf', 'eingereicht', 'genehmigt', 'abgelehnt')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(property_id, year)
);

-- Enable RLS
ALTER TABLE public.property_budgets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read budgets (Admin, Property Manager, Finance, Viewer)
CREATE POLICY "Authenticated users can view budgets"
ON public.property_budgets
FOR SELECT
TO authenticated
USING (true);

-- Only admins and property managers can insert/update/delete
CREATE POLICY "Users can insert budgets"
ON public.property_budgets
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update budgets"
ON public.property_budgets
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Users can delete budgets"
ON public.property_budgets
FOR DELETE
TO authenticated
USING (true);

-- Add budget_position column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN budget_position INTEGER CHECK (budget_position >= 1 AND budget_position <= 5);

-- Create trigger for updated_at
CREATE TRIGGER update_property_budgets_updated_at
BEFORE UPDATE ON public.property_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();