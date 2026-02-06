
-- =====================================================
-- 1. Auto-Booking Triggers (Vorschreibung, Zahlung, Ausgabe)
-- =====================================================

-- Trigger: auto_book_invoice on monthly_invoices INSERT
DROP TRIGGER IF EXISTS trg_auto_book_invoice ON public.monthly_invoices;
CREATE TRIGGER trg_auto_book_invoice
  AFTER INSERT ON public.monthly_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_book_invoice();

-- Trigger: auto_book_payment on payments INSERT
DROP TRIGGER IF EXISTS trg_auto_book_payment ON public.payments;
CREATE TRIGGER trg_auto_book_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_book_payment();

-- Trigger: auto_book_expense on expenses INSERT
DROP TRIGGER IF EXISTS trg_auto_book_expense ON public.expenses;
CREATE TRIGGER trg_auto_book_expense
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_book_expense();

-- =====================================================
-- 2. Fixed Assets / Anlagenbuchhaltung already exists, add RLS
-- =====================================================
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org fixed assets"
  ON public.fixed_assets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org fixed assets"
  ON public.fixed_assets FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org fixed assets"
  ON public.fixed_assets FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org fixed assets"
  ON public.fixed_assets FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
