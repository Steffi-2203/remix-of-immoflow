-- Backfill: Create payment_allocations for monthly_invoices with paid_amount > 0 but no allocations.
-- Addresses NOT NULL constraint on payment_id by finding an existing payment for the invoice,
-- or creating a system payment if none exists.
-- Source: 'backfill' for traceability. Idempotent via ON CONFLICT DO NOTHING.

BEGIN;

-- Step 1: Create system payments for invoices that have paid_amount but no payment record
INSERT INTO payments (id, tenant_id, invoice_id, betrag, buchungs_datum, payment_type, verwendungszweck, source)
SELECT
  gen_random_uuid(),
  mi.tenant_id,
  mi.id,
  mi.paid_amount,
  CURRENT_DATE,
  'sonstiges',
  'System-Zahlung (Backfill für fehlende payment_allocation)',
  'backfill'
FROM monthly_invoices mi
LEFT JOIN (
  SELECT invoice_id, SUM(applied_amount) AS alloc_sum
  FROM payment_allocations
  GROUP BY invoice_id
) pa_sum ON pa_sum.invoice_id = mi.id
LEFT JOIN payments p ON p.invoice_id = mi.id
WHERE mi.paid_amount > 0
  AND COALESCE(pa_sum.alloc_sum, 0) = 0
  AND p.id IS NULL
ON CONFLICT DO NOTHING;

-- Step 2: Create payment_allocations linking to existing or newly created payments
INSERT INTO payment_allocations (id, payment_id, invoice_id, applied_amount, allocation_type, source)
SELECT
  gen_random_uuid(),
  p.id,
  mi.id,
  mi.paid_amount,
  'auto',
  'backfill'
FROM monthly_invoices mi
LEFT JOIN (
  SELECT invoice_id, SUM(applied_amount) AS alloc_sum
  FROM payment_allocations
  GROUP BY invoice_id
) pa_sum ON pa_sum.invoice_id = mi.id
JOIN payments p ON p.invoice_id = mi.id
WHERE mi.paid_amount > 0
  AND COALESCE(pa_sum.alloc_sum, 0) = 0
ON CONFLICT DO NOTHING;

COMMIT;
