import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';
import { sql, eq } from 'drizzle-orm';
import { paymentAllocations, monthlyInvoices } from '@shared/schema';

const hasDb = !!process.env.DATABASE_URL;
const PREFIX = 'int-alloc';
const TENANT_ID = `${PREFIX}-tenant-${Date.now()}`;
const INV_1 = `${PREFIX}-inv1-${Date.now()}`;
const INV_2 = `${PREFIX}-inv2-${Date.now()}`;
const PAY_ID = `${PREFIX}-pay-${Date.now()}`;

describe.skipIf(!hasDb)('allocatePayment – standard allocation', () => {
  beforeAll(async () => {
    await db.execute(sql`
      DELETE FROM payment_allocations WHERE payment_id LIKE ${PREFIX + '%'};
      DELETE FROM payments WHERE id LIKE ${PREFIX + '%'};
      DELETE FROM monthly_invoices WHERE id IN (${INV_1}, ${INV_2});
    `);

    // Create two invoices: Jan €800, Feb €600
    await db.execute(sql`
      INSERT INTO monthly_invoices (id, tenant_id, month, year, gesamtbetrag, paid_amount, status, faellig_am, created_at)
      VALUES
        (${INV_1}, ${TENANT_ID}, 1, 2025, 800, 0, 'offen', '2025-01-05', now()),
        (${INV_2}, ${TENANT_ID}, 2, 2025, 600, 0, 'offen', '2025-02-05', now())
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.execute(sql`
      DELETE FROM payment_allocations WHERE payment_id LIKE ${PREFIX + '%'};
      DELETE FROM payments WHERE id LIKE ${PREFIX + '%'};
      DELETE FROM monthly_invoices WHERE id IN (${INV_1}, ${INV_2});
    `);
  });

  test('full payment covers exactly one invoice via FIFO', async () => {
    const { PaymentService } = await import('../../../server/billing/paymentService');
    const service = new PaymentService();

    const result = await service.allocatePayment({
      paymentId: PAY_ID,
      tenantId: TENANT_ID,
      amount: 800,
      bookingDate: '2025-01-10',
    });

    expect(result.applied).toBe(800);
    expect(result.unapplied).toBe(0);
  });

  test('first invoice is marked bezahlt', async () => {
    const rows = await db.execute(sql`
      SELECT status, paid_amount FROM monthly_invoices WHERE id = ${INV_1}
    `).then(r => r.rows);

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('bezahlt');
    expect(Number(rows[0].paid_amount)).toBe(800);
  });

  test('second invoice remains offen', async () => {
    const rows = await db.execute(sql`
      SELECT status, paid_amount FROM monthly_invoices WHERE id = ${INV_2}
    `).then(r => r.rows);

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('offen');
    expect(Number(rows[0].paid_amount)).toBe(0);
  });

  test('payment_allocations row created with correct amounts', async () => {
    const allocs = await db.execute(sql`
      SELECT * FROM payment_allocations WHERE payment_id = ${PAY_ID}
    `).then(r => r.rows);

    expect(allocs).toHaveLength(1);
    expect(allocs[0].invoice_id).toBe(INV_1);
    expect(Number(allocs[0].applied_amount)).toBe(800);
  });
});
