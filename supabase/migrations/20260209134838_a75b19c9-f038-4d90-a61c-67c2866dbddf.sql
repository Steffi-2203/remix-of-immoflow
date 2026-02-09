
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  invoice_id UUID NULL REFERENCES public.monthly_invoices(id),
  payment_id UUID NULL REFERENCES public.payments(id),
  type TEXT NOT NULL CHECK (type IN ('charge','payment','interest','fee','credit')),
  amount NUMERIC(12,2) NOT NULL,
  booking_date DATE NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_entries_tenant ON public.ledger_entries(tenant_id, booking_date);
CREATE INDEX idx_ledger_entries_invoice ON public.ledger_entries(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_ledger_entries_payment ON public.ledger_entries(payment_id) WHERE payment_id IS NOT NULL;

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can view ledger entries"
  ON public.ledger_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.units u ON u.id = t.unit_id
      WHERE t.id = ledger_entries.tenant_id
      AND (
        public.is_property_manager(auth.uid(), u.property_id)
        OR public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Org users can insert ledger entries"
  ON public.ledger_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.units u ON u.id = t.unit_id
      WHERE t.id = ledger_entries.tenant_id
      AND (
        public.is_property_manager(auth.uid(), u.property_id)
        OR public.is_admin(auth.uid())
      )
    )
  );
