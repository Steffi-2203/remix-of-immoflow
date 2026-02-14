
-- E1a/E1b Tax Reports table
CREATE TABLE public.tax_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'E1a',
  tax_year INTEGER NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  xml_content TEXT,
  status TEXT NOT NULL DEFAULT 'entwurf',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, owner_id, property_id, report_type, tax_year)
);

ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org tax reports"
  ON public.tax_reports FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own org tax reports"
  ON public.tax_reports FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org tax reports"
  ON public.tax_reports FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org tax reports"
  ON public.tax_reports FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE TRIGGER update_tax_reports_updated_at
  BEFORE UPDATE ON public.tax_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
