INSERT INTO payments (id, tenant_id, invoice_id, betrag, buchungs_datum, payment_type, verwendungszweck, source)
VALUES ('pay-0001', (SELECT tenant_id FROM monthly_invoices WHERE id = 'inv-0001'), 'inv-0001', 2207.74, now(), 'ueberweisung', 'Seed-Zahlung pay-0001', 'seed')
ON CONFLICT DO NOTHING;

INSERT INTO payment_allocations (id, payment_id, invoice_id, applied_amount, allocation_type, source)
VALUES ('alloc-seed-pay-0001', 'pay-0001', 'inv-0001', 2207.74, 'auto', 'seed')
ON CONFLICT DO NOTHING;
