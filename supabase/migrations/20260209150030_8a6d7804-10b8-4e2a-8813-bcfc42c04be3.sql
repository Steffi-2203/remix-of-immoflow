-- Create payment_allocations table
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.payments(id),
  invoice_id uuid NOT NULL REFERENCES public.monthly_invoices(id),
  applied_amount numeric(10,2) NOT NULL,
  allocation_type text DEFAULT 'miete',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pa_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_pa_invoice_id ON public.payment_allocations(invoice_id);

-- RLS
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pa_select_managed"
  ON public.payment_allocations FOR SELECT
  USING (
    invoice_id IN (
      SELECT mi.id FROM monthly_invoices mi
      JOIN units u ON u.id = mi.unit_id
      WHERE u.property_id IN (SELECT get_managed_property_ids(auth.uid()))
    )
  );

CREATE POLICY "pa_insert_managed"
  ON public.payment_allocations FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT mi.id FROM monthly_invoices mi
      JOIN units u ON u.id = mi.unit_id
      WHERE u.property_id IN (SELECT get_managed_property_ids(auth.uid()))
    )
  );

CREATE POLICY "pa_delete_managed"
  ON public.payment_allocations FOR DELETE
  USING (
    invoice_id IN (
      SELECT mi.id FROM monthly_invoices mi
      JOIN units u ON u.id = mi.unit_id
      WHERE u.property_id IN (SELECT get_managed_property_ids(auth.uid()))
    )
  );