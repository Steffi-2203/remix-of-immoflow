#!/usr/bin/env npx tsx
/**
 * Idempotent Payment Reassigner
 *
 * Re-runs FIFO allocation for payments that may have been incorrectly assigned.
 * Adapted to the project schema: monthly_invoices, payments, payment_allocations.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/repair/reassign_payments.ts --dry-run
 *   DATABASE_URL=... npx tsx scripts/repair/reassign_payments.ts --apply --batch-size 500
 */

import pg from "pg";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("dry-run", { type: "boolean", default: true, describe: "Preview changes without applying" })
  .option("apply", { type: "boolean", default: false, describe: "Apply reassignment" })
  .option("batch-size", { type: "number", default: 500, describe: "Rows per batch" })
  .option("tenant-id", { type: "string", describe: "Limit to a single tenant" })
  .parseSync();

const isApply = argv.apply === true;
const batchSize = argv["batch-size"];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

async function auditLog(client: pg.PoolClient, action: string, meta: Record<string, unknown>) {
  await client.query(
    `INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
     VALUES (NULL, 'payments', $1, $2, $3::jsonb, now())`,
    [meta.paymentId ?? null, action, JSON.stringify(meta)]
  );
}

async function reassignBatch(client: pg.PoolClient): Promise<number> {
  const tenantFilter = argv["tenant-id"]
    ? `AND p.tenant_id = '${argv["tenant-id"]}'`
    : "";

  // Find payments that have no allocations or whose allocations don't sum to betrag
  const { rows: payments } = await client.query(
    `SELECT p.id, p.tenant_id, p.betrag, p.buchungs_datum, p.created_at
     FROM payments p
     LEFT JOIN (
       SELECT payment_id, SUM(applied_amount) AS total_applied
       FROM payment_allocations
       GROUP BY payment_id
     ) pa ON pa.payment_id = p.id
     WHERE (pa.total_applied IS NULL OR ABS(pa.total_applied - p.betrag) > 0.01)
       ${tenantFilter}
     ORDER BY p.created_at
     LIMIT $1`,
    [batchSize]
  );

  if (payments.length === 0) return 0;

  for (const payment of payments) {
    const paymentId = payment.id as string;
    const tenantId = payment.tenant_id as string;
    const betrag = roundMoney(Number(payment.betrag));

    // Get open/partially paid invoices for this tenant (FIFO by year, month)
    const { rows: invoices } = await client.query(
      `SELECT id, gesamtbetrag, COALESCE(paid_amount, 0) AS paid_amount, month, year
       FROM monthly_invoices
       WHERE tenant_id = $1 AND status IN ('offen', 'teilbezahlt')
       ORDER BY year, month`,
      [tenantId]
    );

    let remaining = betrag;
    const allocations: Array<{ invoiceId: string; amount: number }> = [];

    for (const inv of invoices) {
      if (remaining <= 0) break;
      const total = roundMoney(Number(inv.gesamtbetrag));
      const paid = roundMoney(Number(inv.paid_amount));
      const due = roundMoney(total - paid);
      if (due <= 0) continue;

      const apply = roundMoney(Math.min(remaining, due));
      remaining = roundMoney(remaining - apply);
      allocations.push({ invoiceId: inv.id as string, amount: apply });
    }

    const unapplied = roundMoney(remaining);
    const auditMeta = {
      paymentId,
      tenantId,
      betrag,
      allocations,
      unapplied,
    };

    if (!isApply) {
      // Dry-run: just log what would happen
      console.log(`[DRY-RUN] Payment ${paymentId}: ${allocations.length} allocations, ${unapplied} unapplied`);
      await auditLog(client, "reassign_payment_dryrun", auditMeta);
      continue;
    }

    // Apply changes in a transaction
    try {
      await client.query("BEGIN");

      // Remove existing allocations for this payment
      await client.query(
        `DELETE FROM payment_allocations WHERE payment_id = $1`,
        [paymentId]
      );

      // Insert new FIFO allocations
      for (const alloc of allocations) {
        await client.query(
          `INSERT INTO payment_allocations (id, payment_id, invoice_id, applied_amount, allocation_type, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'repair', now())`,
          [paymentId, alloc.invoiceId, alloc.amount]
        );
      }

      // Recalculate paid_amount on affected invoices
      for (const alloc of allocations) {
        await client.query(
          `UPDATE monthly_invoices
           SET paid_amount = COALESCE((
             SELECT SUM(applied_amount) FROM payment_allocations WHERE invoice_id = $1
           ), 0),
           status = CASE
             WHEN COALESCE((SELECT SUM(applied_amount) FROM payment_allocations WHERE invoice_id = $1), 0) >= gesamtbetrag THEN 'bezahlt'
             WHEN COALESCE((SELECT SUM(applied_amount) FROM payment_allocations WHERE invoice_id = $1), 0) > 0 THEN 'teilbezahlt'
             ELSE 'offen'
           END,
           version = COALESCE(version, 1) + 1,
           updated_at = now()
           WHERE id = $1`,
          [alloc.invoiceId]
        );
      }

      // Handle unapplied remainder
      if (unapplied > 0) {
        await client.query(
          `UPDATE payments SET notizen = COALESCE(notizen, '') || $1 WHERE id = $2`,
          [` [Repair] Überzahlung ${unapplied.toFixed(2)} €`, paymentId]
        );
      }

      await auditLog(client, "reassign_payment_applied", auditMeta);
      await client.query("COMMIT");

      console.log(`[APPLIED] Payment ${paymentId}: ${allocations.length} allocations, ${unapplied} unapplied`);
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error(`[ERROR] Payment ${paymentId}: ${err.message}`);
      await auditLog(client, "reassign_payment_error", { paymentId, error: err.message });
    }
  }

  return payments.length;
}

(async () => {
  console.log(`╔══════════════════════════════════════════╗`);
  console.log(`║  Payment Reassigner (${isApply ? "APPLY" : "DRY-RUN"})${" ".repeat(isApply ? 14 : 12)}║`);
  console.log(`╚══════════════════════════════════════════╝\n`);

  const client = await pool.connect();
  try {
    let total = 0;
    let processed: number;
    do {
      processed = await reassignBatch(client);
      total += processed;
      if (processed > 0) console.log(`  Batch: ${processed} payments processed (total: ${total})`);
    } while (processed > 0 && isApply);

    console.log(`\nDone. Total payments processed: ${total}`);
  } finally {
    client.release();
    await pool.end();
  }
})();
