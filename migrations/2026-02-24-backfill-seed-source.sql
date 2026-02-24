BEGIN;

-- Step 1: Tag all existing payments as source='seed'
-- All current payments were created by seed scripts (no manual payment UI existed before)
UPDATE payments SET source = 'seed' WHERE source IS NULL OR source = 'manual';

-- Step 2: Tag all existing payment_allocations as source='seed'
UPDATE payment_allocations SET source = 'seed' WHERE source IS NULL OR source = 'manual';

-- Step 3: Create missing payment_allocations for orphaned payments (those with invoice_id)
INSERT INTO payment_allocations (payment_id, invoice_id, applied_amount, allocation_type, source)
SELECT p.id, p.invoice_id, p.betrag, 'auto', 'seed'
FROM payments p
LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
WHERE pa.id IS NULL
  AND p.invoice_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 4: Recalculate paid_amount on monthly_invoices from payment_allocations
UPDATE monthly_invoices mi
SET paid_amount = COALESCE(pa_sum.total, 0)
FROM (
  SELECT invoice_id, SUM(applied_amount::numeric) AS total
  FROM payment_allocations
  GROUP BY invoice_id
) pa_sum
WHERE pa_sum.invoice_id = mi.id
  AND mi.paid_amount != COALESCE(pa_sum.total, 0);

-- Step 5: Fix status consistency after paid_amount recalculation
UPDATE monthly_invoices
SET status = 'bezahlt'
WHERE paid_amount >= gesamtbetrag::numeric
  AND gesamtbetrag::numeric > 0
  AND status != 'bezahlt';

UPDATE monthly_invoices
SET status = 'teilbezahlt'
WHERE paid_amount > 0
  AND paid_amount < gesamtbetrag::numeric
  AND status NOT IN ('teilbezahlt', 'bezahlt');

COMMIT;
