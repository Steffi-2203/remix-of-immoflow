import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

const hasDb = !!process.env.DATABASE_URL;
const PREFIX = 'int-unalloc';
const TENANT_ID = `${PREFIX}-tenant-${Date.now()}`;
const PAY_ID = `${PREFIX}-pay-${Date.now()}`;

describe.skipIf(!hasDb)('allocatePayment – no open invoices (fully unallocated)', () => {
  beforeAll(async () => {
    await db.execute(sql`
      DELETE FROM payment_allocations WHERE payment_id LIKE ${PREFIX + '%'};
      DELETE FROM payments WHERE id LIKE ${PREFIX + '%'};
      DELETE FROM transactions WHERE tenant_id = ${TENANT_ID};
    `);
  });

  afterAll(async () => {
    await db.execute(sql`
      DELETE FROM payment_allocations WHERE payment_id LIKE ${PREFIX + '%'};
      DELETE FROM payments WHERE id LIKE ${PREFIX + '%'};
      DELETE FROM transactions WHERE tenant_id = ${TENANT_ID};
    `);
  });

  test('payment with no open invoices is fully unallocated', async () => {
    const { PaymentService } = await import('../../../server/billing/paymentService');
    const service = new PaymentService();

    const result = await service.allocatePayment({
      paymentId: PAY_ID,
      tenantId: TENANT_ID,
      amount: 500,
      bookingDate: '2025-05-10',
    });

    expect(result.applied).toBe(0);
    expect(result.unapplied).toBe(500);
  });

  test('no payment_allocations rows created', async () => {
    const allocs = await db.execute(sql`
      SELECT * FROM payment_allocations WHERE payment_id = ${PAY_ID}
    `).then(r => r.rows);

    expect(allocs).toHaveLength(0);
  });
});
