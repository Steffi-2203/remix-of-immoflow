-- Booking periods table: controls whether a month/year is locked for financial changes
CREATE TABLE IF NOT EXISTS public.booking_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (organization_id, year, month)
);

-- Enable RLS
ALTER TABLE public.booking_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies: org-scoped access
CREATE POLICY "Users can view own org booking periods"
  ON public.booking_periods FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage own org booking periods"
  ON public.booking_periods FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Index for fast lookups
CREATE INDEX idx_booking_periods_org_year_month ON public.booking_periods (organization_id, year, month);