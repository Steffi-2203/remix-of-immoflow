-- Create enum for fee types
CREATE TYPE public.fee_type AS ENUM ('ruecklastschrift', 'mahnung', 'sonstiges');

-- Create tenant_fees table
CREATE TABLE public.tenant_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fee_type public.fee_type NOT NULL DEFAULT 'ruecklastschrift',
  amount NUMERIC NOT NULL DEFAULT 6.00,
  description TEXT,
  sepa_item_id UUID REFERENCES public.sepa_collection_items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.tenant_fees ENABLE ROW LEVEL SECURITY;

-- RLS policies: Access through tenant's unit's property managers
CREATE POLICY "Users can view tenant fees for their managed properties"
ON public.tenant_fees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.property_managers pm ON u.property_id = pm.property_id
    WHERE t.id = tenant_fees.tenant_id
    AND pm.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can insert tenant fees for their managed properties"
ON public.tenant_fees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.property_managers pm ON u.property_id = pm.property_id
    WHERE t.id = tenant_fees.tenant_id
    AND pm.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can update tenant fees for their managed properties"
ON public.tenant_fees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.property_managers pm ON u.property_id = pm.property_id
    WHERE t.id = tenant_fees.tenant_id
    AND pm.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can delete tenant fees for their managed properties"
ON public.tenant_fees
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.property_managers pm ON u.property_id = pm.property_id
    WHERE t.id = tenant_fees.tenant_id
    AND pm.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- Add index for faster lookups
CREATE INDEX idx_tenant_fees_tenant_id ON public.tenant_fees(tenant_id);
CREATE INDEX idx_tenant_fees_sepa_item_id ON public.tenant_fees(sepa_item_id);
CREATE INDEX idx_tenant_fees_paid_at ON public.tenant_fees(paid_at) WHERE paid_at IS NULL;