INSERT INTO payments (id, invoice_id, amount, created_at, source)
VALUES ('pay-0001', 'inv-0001', 2207.74, now(), 'seed')
ON CONFLICT DO NOTHING;

INSERT INTO payment_allocations (id, payment_id, invoice_id, amount, created_at, source)
VALUES ('alloc-seed-pay-0001', 'pay-0001', 'inv-0001', 2207.74, now(), 'seed')
ON CONFLICT DO NOTHING;
