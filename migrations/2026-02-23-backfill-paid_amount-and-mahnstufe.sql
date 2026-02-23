BEGIN;

ALTER TABLE monthly_invoices
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mahnstufe INTEGER DEFAULT 0;

UPDATE monthly_invoices mi
SET paid_amount = COALESCE(sub.total_paid, 0)
FROM (
  SELECT pa.invoice_id, SUM(pa.amount::numeric) AS total_paid
  FROM payment_allocations pa
  GROUP BY pa.invoice_id
) sub
WHERE mi.id = sub.invoice_id
  AND (mi.paid_amount IS NULL OR mi.paid_amount = 0);

UPDATE monthly_invoices
SET mahnstufe = 1
WHERE status IN ('ueberfaellig', 'gemahnt')
  AND (mahnstufe IS NULL OR mahnstufe = 0)
  AND faellig_am < CURRENT_DATE - INTERVAL '14 days';

UPDATE monthly_invoices
SET mahnstufe = 2
WHERE status IN ('ueberfaellig', 'gemahnt')
  AND (mahnstufe IS NULL OR mahnstufe < 2)
  AND faellig_am < CURRENT_DATE - INTERVAL '30 days';

UPDATE monthly_invoices
SET mahnstufe = 3
WHERE status IN ('ueberfaellig', 'gemahnt')
  AND (mahnstufe IS NULL OR mahnstufe < 3)
  AND faellig_am < CURRENT_DATE - INTERVAL '60 days';

UPDATE monthly_invoices
SET status = 'bezahlt'
WHERE paid_amount >= gesamt_betrag::numeric
  AND status NOT IN ('bezahlt', 'storniert');

UPDATE monthly_invoices
SET status = 'teilbezahlt'
WHERE paid_amount > 0
  AND paid_amount < gesamt_betrag::numeric
  AND status NOT IN ('bezahlt', 'storniert', 'teilbezahlt');

COMMIT;
