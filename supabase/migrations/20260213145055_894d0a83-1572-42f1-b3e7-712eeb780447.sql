
-- Create table for WEG circulation resolutions (Umlaufbeschlüsse)
CREATE TABLE public.weg_circulation_resolutions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'angenommen', 'abgelehnt', 'abgelaufen')),
  votes_yes INTEGER NOT NULL DEFAULT 0,
  votes_no INTEGER NOT NULL DEFAULT 0,
  votes_abstain INTEGER NOT NULL DEFAULT 0,
  total_owners INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weg_circulation_resolutions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their org resolutions"
  ON public.weg_circulation_resolutions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create resolutions for their org"
  ON public.weg_circulation_resolutions FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their org resolutions"
  ON public.weg_circulation_resolutions FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their org resolutions"
  ON public.weg_circulation_resolutions FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

-- Timestamp trigger
CREATE TRIGGER update_weg_circulation_resolutions_updated_at
  BEFORE UPDATE ON public.weg_circulation_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
