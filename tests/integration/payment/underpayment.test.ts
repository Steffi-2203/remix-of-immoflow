import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

const hasDb = !!process.env.DATABASE_URL;
const PREFIX = 'int-underpay';
const TENANT_ID = `${PREFIX}-tenant-${Date.now()}`;
const INV_ID = `${PREFIX}-inv-${Date.now()}`;
const PAY_ID = `${PREFIX}-pay-${Date.now()}`;

describe.skipIf(!hasDb)('allocatePayment – underpayment / partial', () => {
  beforeAll(async () => {
    await db.execute(sql`
      DELETE FROM payment_allocations WHERE payment_id LIKE ${PREFIX + '%'};
      DELETE FROM payments WHERE id LIKE ${PREFIX + '%'};
      DELETE FROM monthly_invoices WHERE id = ${INV_ID};
    `);

    await db.execute(sql`
      INSERT INTO monthly_invoices (id, tenant_id, month, year, gesamtbetrag, paid_amount, status, faellig_am, created_at)
      VALUES (${INV_ID}, ${TENANT_ID}, 4, 2025, 1000, 0, 'offen', '2025-04-05', now())
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.execute(sql`
      DELETE FROM payment_allocations WHERE payment_id LIKE ${PREFIX + '%'};
      DELETE FROM payments WHERE id LIKE ${PREFIX + '%'};
      DELETE FROM monthly_invoices WHERE id = ${INV_ID};
    `);
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
