-- Add source column to payments and payment_allocations
-- Values: 'manual' (default, user-created), 'seed' (test/demo data), 'auto' (system-generated)

ALTER TABLE payments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE payment_allocations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Backfill: tag existing seed data where possible (payments with 'seed' in verwendungszweck or lacking org context)
-- No-op for now — seed scripts will tag going forward
