SELECT
  'summary' AS section,
  COUNT(*) AS total_invoices,
  COUNT(*) FILTER (WHERE paid_amount > 0) AS invoices_with_payment,
  COUNT(*) FILTER (WHERE mahnstufe > 0) AS invoices_with_dunning,
  SUM(gesamtbetrag::numeric) AS total_invoiced,
  SUM(paid_amount) AS total_paid,
  SUM(gesamtbetrag::numeric) - SUM(paid_amount) AS total_outstanding
FROM monthly_invoices;

SELECT
  'variance_check' AS section,
  mi.id AS invoice_id,
  mi.paid_amount AS schema_paid,
  COALESCE(pa_sum.alloc_total, 0) AS allocation_total,
  mi.paid_amount - COALESCE(pa_sum.alloc_total, 0) AS variance
FROM monthly_invoices mi
LEFT JOIN (
  SELECT invoice_id, SUM(applied_amount::numeric) AS alloc_total
  FROM payment_allocations
  GROUP BY invoice_id
) pa_sum ON pa_sum.invoice_id = mi.id
WHERE ABS(mi.paid_amount - COALESCE(pa_sum.alloc_total, 0)) > 0.01
ORDER BY ABS(mi.paid_amount - COALESCE(pa_sum.alloc_total, 0)) DESC
LIMIT 50;

SELECT
  'status_consistency' AS section,
  mi.id AS invoice_id,
  mi.status,
  mi.paid_amount,
  mi.gesamtbetrag,
  CASE
    WHEN mi.paid_amount >= mi.gesamtbetrag::numeric AND mi.status != 'bezahlt' THEN 'MISMATCH: should be bezahlt'
    WHEN mi.paid_amount > 0 AND mi.paid_amount < mi.gesamtbetrag::numeric AND mi.status NOT IN ('teilbezahlt', 'bezahlt') THEN 'MISMATCH: should be teilbezahlt'
    WHEN mi.paid_amount = 0 AND mi.status = 'bezahlt' THEN 'MISMATCH: bezahlt but no payment'
    ELSE 'OK'
  END AS check_result
FROM monthly_invoices mi
WHERE (
    (mi.paid_amount >= mi.gesamtbetrag::numeric AND mi.status != 'bezahlt')
    OR (mi.paid_amount > 0 AND mi.paid_amount < mi.gesamtbetrag::numeric AND mi.status NOT IN ('teilbezahlt', 'bezahlt'))
    OR (mi.paid_amount = 0 AND mi.status = 'bezahlt')
  )
ORDER BY mi.id
LIMIT 50;

SELECT
  'mahnstufe_distribution' AS section,
  mahnstufe,
  COUNT(*) AS count,
  SUM(gesamtbetrag::numeric - paid_amount) AS outstanding_amount
FROM monthly_invoices
WHERE status NOT IN ('bezahlt')
GROUP BY mahnstufe
ORDER BY mahnstufe;
