import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db, sql, hasDb, cleanupByPrefix } from '../setup/db';
import { seedInvoice } from '../setup/seed';

const PREFIX = 'int-alloc';
const TENANT_ID = `${PREFIX}-tenant-${Date.now()}`;
const INV_1 = `${PREFIX}-inv1-${Date.now()}`;
const INV_2 = `${PREFIX}-inv2-${Date.now()}`;
const PAY_ID = `${PREFIX}-pay-${Date.now()}`;

describe.skipIf(!hasDb)('allocatePayment – standard allocation', () => {
  beforeAll(async () => {
    await cleanupByPrefix(PREFIX);
    await seedInvoice({ id: INV_1, tenantId: TENANT_ID, month: 1, year: 2025, gesamtbetrag: 800 });
    await seedInvoice({ id: INV_2, tenantId: TENANT_ID, month: 2, year: 2025, gesamtbetrag: 600 });
  });

  afterAll(async () => {
    await cleanupByPrefix(PREFIX);
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
