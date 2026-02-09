import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db, sql, hasDb, cleanupByPrefix } from '../setup/db';
import { seedInvoice } from '../setup/seed';

const PREFIX = 'int-overpay';
const TENANT_ID = `${PREFIX}-tenant-${Date.now()}`;
const INV_ID = `${PREFIX}-inv-${Date.now()}`;
const PAY_ID = `${PREFIX}-pay-${Date.now()}`;

describe.skipIf(!hasDb)('allocatePayment – overpayment handling', () => {
  beforeAll(async () => {
    await cleanupByPrefix(PREFIX);
    await seedInvoice({ id: INV_ID, tenantId: TENANT_ID, month: 3, year: 2025, gesamtbetrag: 500 });
  });

  afterAll(async () => {
    await cleanupByPrefix(PREFIX);
  });

  test('payment of €700 against €500 invoice yields €200 unapplied', async () => {
    const { PaymentService } = await import('../../../server/billing/paymentService');
    const service = new PaymentService();

    const result = await service.allocatePayment({
      paymentId: PAY_ID,
      tenantId: TENANT_ID,
      amount: 700,
      bookingDate: '2025-03-10',
    });

    expect(result.applied).toBe(500);
    expect(result.unapplied).toBe(200);
  });

  test('invoice is fully paid (bezahlt)', async () => {
    const rows = await db.execute(sql`
      SELECT status, paid_amount FROM monthly_invoices WHERE id = ${INV_ID}
    `).then(r => r.rows);

    expect(rows[0].status).toBe('bezahlt');
    expect(Number(rows[0].paid_amount)).toBe(500);
  });

  test('overpayment noted on payment record', async () => {
    const rows = await db.execute(sql`
      SELECT notizen FROM payments WHERE id = ${PAY_ID}
    `).then(r => r.rows);

    expect(rows).toHaveLength(1);
    expect(String(rows[0].notizen)).toContain('200');
  });
});
