import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db, sql, hasDb, cleanupByPrefix } from '../setup/db';
import { seedInvoice } from '../setup/seed';

const PREFIX = 'int-underpay';
const TENANT_ID = `${PREFIX}-tenant-${Date.now()}`;
const INV_ID = `${PREFIX}-inv-${Date.now()}`;
const PAY_ID = `${PREFIX}-pay-${Date.now()}`;

describe.skipIf(!hasDb)('allocatePayment – underpayment / partial', () => {
  beforeAll(async () => {
    await cleanupByPrefix(PREFIX);
    await seedInvoice({ id: INV_ID, tenantId: TENANT_ID, month: 4, year: 2025, gesamtbetrag: 1000 });
  });

  afterAll(async () => {
    await cleanupByPrefix(PREFIX);
  });

  test('partial payment of €300 against €1000 invoice', async () => {
    const { PaymentService } = await import('../../../server/billing/paymentService');
    const service = new PaymentService();

    const result = await service.allocatePayment({
      paymentId: PAY_ID,
      tenantId: TENANT_ID,
      amount: 300,
      bookingDate: '2025-04-10',
    });

    expect(result.applied).toBe(300);
    expect(result.unapplied).toBe(0);
  });

  test('invoice status is teilbezahlt', async () => {
    const rows = await db.execute(sql`
      SELECT status, paid_amount FROM monthly_invoices WHERE id = ${INV_ID}
    `).then(r => r.rows);

    expect(rows[0].status).toBe('teilbezahlt');
    expect(Number(rows[0].paid_amount)).toBe(300);
  });

  test('allocation records partial amount correctly', async () => {
    const allocs = await db.execute(sql`
      SELECT * FROM payment_allocations WHERE payment_id = ${PAY_ID}
    `).then(r => r.rows);

    expect(allocs).toHaveLength(1);
    expect(Number(allocs[0].applied_amount)).toBe(300);
  });
});
