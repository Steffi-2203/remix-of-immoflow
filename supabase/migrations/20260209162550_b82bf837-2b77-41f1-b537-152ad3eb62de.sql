
-- Function: Recompute paid_amount and status on monthly_invoices
-- from payment_allocations whenever allocations change
CREATE OR REPLACE FUNCTION public.recompute_invoice_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  _invoice_id UUID;
  _total_applied NUMERIC(12,2);
  _gesamtbetrag NUMERIC(12,2);
BEGIN
  IF (TG_OP = 'DELETE') THEN
    _invoice_id := OLD.invoice_id;
  ELSE
    _invoice_id := NEW.invoice_id;
  END IF;

  -- Also handle old invoice_id on UPDATE (if invoice changed)
  IF (TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id AND OLD.invoice_id IS NOT NULL) THEN
    SELECT COALESCE(SUM(applied_amount), 0) INTO _total_applied
    FROM payment_allocations WHERE invoice_id = OLD.invoice_id;

    SELECT gesamtbetrag INTO _gesamtbetrag
    FROM monthly_invoices WHERE id = OLD.invoice_id;

    IF _gesamtbetrag IS NOT NULL THEN
      UPDATE monthly_invoices
      SET paid_amount = _total_applied,
          status = CASE
            WHEN _total_applied >= _gesamtbetrag THEN 'bezahlt'
            WHEN _total_applied > 0 THEN 'teilbezahlt'
            ELSE 'offen'
          END,
          version = COALESCE(version, 1) + 1,
          updated_at = now()
      WHERE id = OLD.invoice_id;
    END IF;
  END IF;

  -- Update current invoice
  IF _invoice_id IS NOT NULL THEN
    SELECT COALESCE(SUM(applied_amount), 0) INTO _total_applied
    FROM payment_allocations WHERE invoice_id = _invoice_id;

    SELECT gesamtbetrag INTO _gesamtbetrag
    FROM monthly_invoices WHERE id = _invoice_id;

    IF _gesamtbetrag IS NOT NULL THEN
      UPDATE monthly_invoices
      SET paid_amount = _total_applied,
          status = CASE
            WHEN _total_applied >= _gesamtbetrag THEN 'bezahlt'
            WHEN _total_applied > 0 THEN 'teilbezahlt'
            ELSE 'offen'
          END,
          version = COALESCE(version, 1) + 1,
          updated_at = now()
      WHERE id = _invoice_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on payment_allocations
DROP TRIGGER IF EXISTS trg_recompute_invoice_paid ON payment_allocations;
CREATE TRIGGER trg_recompute_invoice_paid
AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
FOR EACH ROW EXECUTE FUNCTION public.recompute_invoice_paid_amount();
