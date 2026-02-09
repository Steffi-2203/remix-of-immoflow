import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db, sql, hasDb, cleanupByPrefix } from '../setup/db';

const PREFIX = 'int-unalloc';
const TENANT_ID = `${PREFIX}-tenant-${Date.now()}`;
const PAY_ID = `${PREFIX}-pay-${Date.now()}`;

describe.skipIf(!hasDb)('allocatePayment – no open invoices (fully unallocated)', () => {
  beforeAll(async () => {
    await cleanupByPrefix(PREFIX);
  });

  afterAll(async () => {
    await cleanupByPrefix(PREFIX);
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
