
-- Cost circles (Abrechnungskreise) for granular BK settlement
CREATE TABLE public.cost_circles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_circles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.unit_cost_circles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  cost_circle_id UUID NOT NULL REFERENCES public.cost_circles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, cost_circle_id)
);

ALTER TABLE public.unit_cost_circles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ADD COLUMN cost_circle_id UUID REFERENCES public.cost_circles(id) ON DELETE SET NULL;

-- RLS for cost_circles using is_property_manager
CREATE POLICY "Managers can view cost circles"
  ON public.cost_circles FOR SELECT
  USING (is_property_manager(auth.uid(), property_id) OR is_admin(auth.uid()));

CREATE POLICY "Managers can insert cost circles"
  ON public.cost_circles FOR INSERT
  WITH CHECK (is_property_manager(auth.uid(), property_id) OR is_admin(auth.uid()));

CREATE POLICY "Managers can update cost circles"
  ON public.cost_circles FOR UPDATE
  USING (is_property_manager(auth.uid(), property_id) OR is_admin(auth.uid()));

CREATE POLICY "Managers can delete cost circles"
  ON public.cost_circles FOR DELETE
  USING (is_property_manager(auth.uid(), property_id) OR is_admin(auth.uid()));

-- RLS for unit_cost_circles
CREATE POLICY "Managers can view unit cost circles"
  ON public.unit_cost_circles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_circles cc
      WHERE cc.id = unit_cost_circles.cost_circle_id
        AND (is_property_manager(auth.uid(), cc.property_id) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Managers can insert unit cost circles"
  ON public.unit_cost_circles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cost_circles cc
      WHERE cc.id = unit_cost_circles.cost_circle_id
        AND (is_property_manager(auth.uid(), cc.property_id) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Managers can delete unit cost circles"
  ON public.unit_cost_circles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cost_circles cc
      WHERE cc.id = unit_cost_circles.cost_circle_id
        AND (is_property_manager(auth.uid(), cc.property_id) OR is_admin(auth.uid()))
    )
  );

CREATE INDEX idx_cost_circles_property ON public.cost_circles(property_id);
CREATE INDEX idx_unit_cost_circles_unit ON public.unit_cost_circles(unit_id);
CREATE INDEX idx_unit_cost_circles_circle ON public.unit_cost_circles(cost_circle_id);
CREATE INDEX idx_expenses_cost_circle ON public.expenses(cost_circle_id);
