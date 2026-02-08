-- Idempotenter Backfill: erstellt adjustment invoice_lines für historische Perioden
-- Usage: run with run_water_backfill.js which supports dry-run
-- Example: node scripts/backfill/run_water_backfill.js --dry-run
--          node scripts/backfill/run_water_backfill.js --execute

-- This SQL is a placeholder; the actual backfill logic is in run_water_backfill.js
-- which uses the SettlementService.calculateWaterCostShares() method.
SELECT 1;
