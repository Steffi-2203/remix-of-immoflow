-- Create table for finalized settlements per unit/tenant
CREATE TABLE public.settlement_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES public.operating_cost_settlements(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id),
  tenant_id UUID REFERENCES public.tenants(id),
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  is_leerstand_bk BOOLEAN NOT NULL DEFAULT false,
  is_leerstand_hk BOOLEAN NOT NULL DEFAULT false,
  bk_anteil NUMERIC NOT NULL DEFAULT 0,
  hk_anteil NUMERIC NOT NULL DEFAULT 0,
  bk_vorschuss NUMERIC NOT NULL DEFAULT 0,
  hk_vorschuss NUMERIC NOT NULL DEFAULT 0,
  bk_saldo NUMERIC NOT NULL DEFAULT 0,
  hk_saldo NUMERIC NOT NULL DEFAULT 0,
  gesamt_saldo NUMERIC NOT NULL DEFAULT 0,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_status TEXT, -- 'pending', 'sent', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to operating_cost_settlements for finalization
ALTER TABLE public.operating_cost_settlements 
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_bk NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_hk NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bk_mieter NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS hk_mieter NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bk_eigentuemer NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS hk_eigentuemer NUMERIC NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to settlement_items" 
ON public.settlement_items 
FOR ALL 
USING (true)
WITH CHECK (true);