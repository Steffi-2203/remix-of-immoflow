import { describe, test, expect, beforeEach } from 'vitest';
import { hasDb, resetDb, db, sql } from '../setup/db';
import { createTenant, createInvoice, seedOrg, seedProperty, seedUnit } from '../setup/seed';

describe.skipIf(!hasDb)('Zahlung wird korrekt zugeordnet', () => {
  let tenantRow: any;
  let invoiceRow: any;
  const PREFIX = 'int-zuord';

  beforeEach(async () => {
    await resetDb();

    const orgId = `${PREFIX}-org-${Date.now()}`;
    const propId = `${PREFIX}-prop-${Date.now()}`;
    const unitId = `${PREFIX}-unit-${Date.now()}`;

    await seedOrg({ id: orgId });
    await seedProperty({ id: propId, organizationId: orgId });
    await seedUnit({ id: unitId, propertyId: propId });

    tenantRow = await createTenant({ unitId });
    invoiceRow = await createInvoice({ tenantId: tenantRow.id, gesamtbetrag: 100, month: 1, year: 2025 });
  });

  test('allocatePayment ordnet Zahlung der ältesten offenen Rechnung zu', async () => {
    const { PaymentService } = await import('../../../server/billing/paymentService');
    const service = new PaymentService();

    const payId = `${PREFIX}-pay-${Date.now()}`;
    const result = await service.allocatePayment({
      paymentId: payId,
      tenantId: tenantRow.id,
      amount: 100,
      bookingDate: '2025-01-15',
    });

    expect(result.applied).toBe(100);
    expect(result.unapplied).toBe(0);

    const allocs = await db.execute(sql`
      SELECT * FROM payment_allocations WHERE payment_id = ${payId}
    `).then(r => r.rows);

    expect(allocs).toHaveLength(1);
    expect(allocs[0].invoice_id).toBe(invoiceRow.id);
    expect(Number(allocs[0].applied_amount)).toBe(100);
  });

  test('Rechnung wird nach vollständiger Zahlung als bezahlt markiert', async () => {
    const { PaymentService } = await import('../../../server/billing/paymentService');
    const service = new PaymentService();

    await service.allocatePayment({
      paymentId: `${PREFIX}-pay2-${Date.now()}`,
      tenantId: tenantRow.id,
      amount: 100,
      bookingDate: '2025-01-15',
    });

    const rows = await db.execute(sql`
      SELECT status, paid_amount FROM monthly_invoices WHERE id = ${invoiceRow.id}
    `).then(r => r.rows);

    expect(rows[0].status).toBe('bezahlt');
    expect(Number(rows[0].paid_amount)).toBe(100);
  });

  test('Teilzahlung setzt Status auf teilbezahlt', async () => {
    const { PaymentService } = await import('../../../server/billing/paymentService');
    const service = new PaymentService();

    await service.allocatePayment({
      paymentId: `${PREFIX}-pay3-${Date.now()}`,
      tenantId: tenantRow.id,
      amount: 40,
      bookingDate: '2025-01-15',
    });

    const rows = await db.execute(sql`
      SELECT status, paid_amount FROM monthly_invoices WHERE id = ${invoiceRow.id}
    `).then(r => r.rows);

    expect(rows[0].status).toBe('teilbezahlt');
    expect(Number(rows[0].paid_amount)).toBe(40);
  });
});
