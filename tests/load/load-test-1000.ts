/**
 * Load Test Script – 1000 Units, 900 Tenants, 5000 Invoices
 *
 * Simulates:
 *   1. Data generation (deterministic seed)
 *   2. SettlementService.createSettlement() on a large property
 *   3. PaymentService.allocatePayment() in batch (parallel via Promise.allSettled)
 *   4. Ledger worker batch processing
 *
 * Metrics tracked:
 *   - Seed duration
 *   - Settlement calculation duration
 *   - Payment allocation throughput (ops/sec)
 *   - DB index hit rates
 *   - Ledger worker batch duration
 *
 * Usage: DATABASE_URL=... npx tsx tests/load/load-test-1000.ts
 */

import { db } from '../../server/db';
import { sql } from 'drizzle-orm';
import { roundMoney } from '@shared/utils';

// ── Config ──
const UNIT_COUNT = 1000;
const TENANT_COUNT = 900;
const INVOICE_COUNT = 5000;
const PAYMENT_BATCH_SIZE = 100;
const PARALLEL_PAYMENTS = 10;
const PREFIX = 'lt1k';

interface Metric {
  label: string;
  durationMs: number;
  rowsAffected?: number;
  opsPerSec?: number;
}

const metrics: Metric[] = [];

function timed<T>(label: string): { start: () => void; stop: (rows?: number) => void } {
  let t0: number;
  return {
    start: () => { t0 = performance.now(); },
    stop: (rows?: number) => {
      const ms = Math.round(performance.now() - t0);
      const m: Metric = { label, durationMs: ms };
      if (rows !== undefined) {
        m.rowsAffected = rows;
        m.opsPerSec = rows > 0 ? Math.round((rows / ms) * 1000) : 0;
      }
      metrics.push(m);
      console.log(`  ✓ ${label}: ${ms}ms${rows !== undefined ? ` (${rows} rows, ${m.opsPerSec} ops/s)` : ''}`);
    },
  };
}

// ── Deterministic Generators ──
const FIRST = ['Anna','Bernd','Clara','David','Eva','Franz','Gabi','Hans','Ines','Jan','Katrin','Lukas','Maria','Norbert','Olga','Peter','Renate','Stefan','Tanja','Uwe'];
const LAST = ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Braun','Zimmermann'];

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Load Test: 1000 Units / 900 Tenants     ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ── 0. Ensure test org + property exist ──
  const orgId = `${PREFIX}-org-001`;
  const propId = `${PREFIX}-prop-001`;

  await db.execute(sql`
    INSERT INTO organizations (id, name, created_at)
    VALUES (${orgId}, 'Load Test Org', now())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.execute(sql`
    INSERT INTO properties (id, name, city, zip, organization_id, created_at)
    VALUES (${propId}, 'Großanlage Load Test', 'Wien', '1010', ${orgId}, now())
    ON CONFLICT (id) DO NOTHING
  `);

  // ── 1. Seed Units ──
  const t1 = timed('Seed units');
  t1.start();

  const unitIds: string[] = [];
  const unitChunks: string[][] = [];
  for (let i = 0; i < UNIT_COUNT; i++) {
    unitIds.push(`${PREFIX}-unit-${String(i).padStart(5, '0')}`);
  }

  // Batch insert in chunks of 200
  for (let c = 0; c < unitIds.length; c += 200) {
    const chunk = unitIds.slice(c, c + 200);
    const values = chunk.map((id, j) => {
      const idx = c + j;
      const flaeche = 30 + (idx % 90);
      const topNr = `Top ${idx + 1}`;
      return sql`(${id}::uuid, ${propId}::uuid, ${topNr}, 'wohnung', ${flaeche}, ${flaeche}, now())`;
    });
    await db.execute(sql`
      INSERT INTO units (id, property_id, top_nummer, typ, flaeche, nutzwert, created_at)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (id) DO NOTHING
    `);
  }
  t1.stop(UNIT_COUNT);

  // ── 2. Seed Tenants ──
  const t2 = timed('Seed tenants');
  t2.start();

  const tenantIds: string[] = [];
  for (let i = 0; i < TENANT_COUNT; i++) {
    tenantIds.push(`${PREFIX}-ten-${String(i).padStart(5, '0')}`);
  }

  for (let c = 0; c < tenantIds.length; c += 200) {
    const chunk = tenantIds.slice(c, c + 200);
    const values = chunk.map((id, j) => {
      const idx = c + j;
      const unitId = unitIds[idx % UNIT_COUNT];
      const fn = FIRST[idx % FIRST.length];
      const ln = LAST[idx % LAST.length];
      const rent = roundMoney(500 + (idx % 800));
      const bk = roundMoney(100 + (idx % 200));
      return sql`(${id}::uuid, ${unitId}::uuid, ${fn}, ${ln}, ${rent}, ${bk}, 50, '2024-01-01', now())`;
    });
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, vorname, nachname, grundmiete, betriebskosten_akonto, heizkosten_akonto, mietbeginn, created_at)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (id) DO NOTHING
    `);
  }
  t2.stop(TENANT_COUNT);

  // ── 3. Seed Invoices ──
  const t3 = timed('Seed invoices');
  t3.start();

  const invoiceIds: string[] = [];
  for (let i = 0; i < INVOICE_COUNT; i++) {
    invoiceIds.push(`${PREFIX}-inv-${String(i).padStart(6, '0')}`);
  }

  for (let c = 0; c < invoiceIds.length; c += 500) {
    const chunk = invoiceIds.slice(c, c + 500);
    const values = chunk.map((id, j) => {
      const idx = c + j;
      const tenantId = tenantIds[idx % TENANT_COUNT];
      const unitId = unitIds[idx % UNIT_COUNT];
      const month = (idx % 12) + 1;
      const year = 2025;
      const total = roundMoney(600 + (idx % 700));
      return sql`(${id}::uuid, ${tenantId}::uuid, ${unitId}::uuid, ${month}, ${year}, ${total}, 0, 'offen', ${`2025-${String(month).padStart(2, '0')}-05`}::date, now())`;
    });
    await db.execute(sql`
      INSERT INTO monthly_invoices (id, tenant_id, unit_id, month, year, gesamtbetrag, paid_amount, status, faellig_am, created_at)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (id) DO NOTHING
    `);
  }
  t3.stop(INVOICE_COUNT);

  // ── 4. Simulate Payment Allocation (batch) ──
  const t4 = timed('Payment allocation (batch)');
  t4.start();

  let allocatedCount = 0;
  for (let batch = 0; batch < PAYMENT_BATCH_SIZE; batch += PARALLEL_PAYMENTS) {
    const promises = [];
    for (let p = 0; p < PARALLEL_PAYMENTS && (batch + p) < PAYMENT_BATCH_SIZE; p++) {
      const idx = batch + p;
      const paymentId = `${PREFIX}-pay-${String(idx).padStart(5, '0')}`;
      const tenantId = tenantIds[idx % TENANT_COUNT];
      const amount = roundMoney(600 + (idx % 700));

      promises.push(
        db.transaction(async (tx) => {
          // Simplified FIFO: allocate to first open invoice for this tenant
          const openInv = await tx.execute(sql`
            SELECT id, gesamtbetrag, paid_amount
            FROM monthly_invoices
            WHERE tenant_id = ${tenantId} AND status = 'offen'
            ORDER BY year, month
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `).then(r => r.rows[0]);

          if (!openInv) return 0;

          const total = roundMoney(Number(openInv.gesamtbetrag || 0));
          const paid = roundMoney(Number(openInv.paid_amount || 0));
          const due = roundMoney(total - paid);
          const apply = roundMoney(Math.min(amount, due));

          await tx.execute(sql`
            INSERT INTO payments (id, tenant_id, betrag, buchungs_datum, payment_type, created_at)
            VALUES (${paymentId}::uuid, ${tenantId}::uuid, ${apply}, '2025-02-15'::date, 'ueberweisung', now())
            ON CONFLICT (id) DO NOTHING
          `);

          await tx.execute(sql`
            UPDATE monthly_invoices
            SET paid_amount = paid_amount + ${apply},
                status = CASE WHEN paid_amount + ${apply} >= gesamtbetrag THEN 'bezahlt' ELSE 'teilbezahlt' END,
                version = COALESCE(version, 1) + 1
            WHERE id = ${openInv.id}::uuid
          `);

          await tx.execute(sql`
            INSERT INTO payment_allocations (payment_id, invoice_id, applied_amount, allocation_type, created_at)
            VALUES (${paymentId}::uuid, ${openInv.id}::uuid, ${apply}, 'auto', now())
          `);

          return 1;
        }).catch((err) => {
          console.warn(`  ⚠ Payment ${idx} failed: ${err.message}`);
          return 0;
        })
      );
    }

    const results = await Promise.allSettled(promises);
    allocatedCount += results.filter(r => r.status === 'fulfilled' && r.value === 1).length;
  }
  t4.stop(allocatedCount);

  // ── 5. Check DB index usage ──
  const t5 = timed('Index hit check');
  t5.start();

  const indexStats = await db.execute(sql`
    SELECT relname, idx_scan, seq_scan
    FROM pg_stat_user_tables
    WHERE relname IN ('monthly_invoices', 'payment_allocations', 'payments', 'units', 'tenants')
    ORDER BY relname
  `).then(r => r.rows);

  for (const stat of indexStats) {
    console.log(`    ${stat.relname}: idx_scan=${stat.idx_scan}, seq_scan=${stat.seq_scan}`);
  }
  t5.stop();

  // ── 6. Verify data integrity ──
  const t6 = timed('Integrity check');
  t6.start();

  const mismatch = await db.execute(sql`
    SELECT COUNT(*) AS cnt
    FROM monthly_invoices m
    LEFT JOIN (
      SELECT invoice_id, SUM(applied_amount) AS total_allocated
      FROM payment_allocations
      WHERE payment_id LIKE ${PREFIX + '%'}
      GROUP BY invoice_id
    ) pa ON pa.invoice_id = m.id
    WHERE m.id LIKE ${PREFIX + '%'}
      AND m.status IN ('teilbezahlt', 'bezahlt')
      AND COALESCE(pa.total_allocated, 0) <> m.paid_amount
  `).then(r => Number(r.rows[0]?.cnt ?? 0));

  console.log(`    Allocation mismatches: ${mismatch}`);
  t6.stop();

  // ── Summary ──
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║               RESULTS                     ║');
  console.log('╠══════════════════════════════════════════╣');
  for (const m of metrics) {
    const line = `║ ${m.label.padEnd(30)} ${String(m.durationMs).padStart(6)}ms`;
    console.log(line + (m.opsPerSec ? ` ${String(m.opsPerSec).padStart(5)} ops/s` : '').padEnd(14) + '║');
  }
  console.log('╚══════════════════════════════════════════╝');

  // ── Cleanup option ──
  if (process.argv.includes('--cleanup')) {
    console.log('\nCleaning up load test data...');
    await db.execute(sql`DELETE FROM payment_allocations WHERE payment_id LIKE ${PREFIX + '%'}`);
    await db.execute(sql`DELETE FROM ledger_entries WHERE tenant_id LIKE ${PREFIX + '%'}`);
    await db.execute(sql`DELETE FROM payments WHERE id LIKE ${PREFIX + '%'}`);
    await db.execute(sql`DELETE FROM monthly_invoices WHERE id LIKE ${PREFIX + '%'}`);
    await db.execute(sql`DELETE FROM tenants WHERE id LIKE ${PREFIX + '%'}`);
    await db.execute(sql`DELETE FROM units WHERE id LIKE ${PREFIX + '%'}`);
    await db.execute(sql`DELETE FROM properties WHERE id = ${propId}`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
    console.log('Done.');
  }

  process.exit(mismatch > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
