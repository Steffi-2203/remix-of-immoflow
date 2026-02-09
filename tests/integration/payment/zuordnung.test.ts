import { describe, test, expect, beforeEach } from 'vitest';
import { hasDb, resetDb, db, sql } from '../setup/db';
import { createTenant, createInvoice, createPayment, seedOrg, seedProperty, seedUnit } from '../setup/seed';
import { paymentService } from '../../../server/billing/paymentService';
import { paymentAllocations } from '@shared/schema';

describe.skipIf(!hasDb)('PaymentService – Zahlungszuordnung (Integration)', () => {
  const PREFIX = 'int-zuord';
  let unitId: string;

  beforeEach(async () => {
    await resetDb();
    const orgId = `${PREFIX}-org-${Date.now()}`;
    const propId = `${PREFIX}-prop-${Date.now()}`;
    unitId = `${PREFIX}-unit-${Date.now()}`;
    await seedOrg({ id: orgId });
    await seedProperty({ id: propId, organizationId: orgId });
    await seedUnit({ id: unitId, propertyId: propId });
  });

  // ---------------------------------------------------------
  // 1) Standardfall: Zahlung == Rechnung
  // ---------------------------------------------------------
  test('ordnet Zahlung korrekt einer Rechnung zu (100 → 100)', async () => {
    const tenant = await createTenant({ unitId });
    const invoice = await createInvoice({ tenantId: tenant.id, gesamtbetrag: 100 });
    const payment = await createPayment({ tenantId: tenant.id, amount: 100 });

    const result = await paymentService.allocatePayment({
      paymentId: payment.id as string,
      tenantId: tenant.id as string,
      amount: 100,
    });

    expect(result.applied).toBe(100);
    expect(result.unapplied).toBe(0);

    const allocs = await db.select().from(paymentAllocations);
    expect(allocs.length).toBe(1);
    expect(allocs[0].invoiceId).toBe(invoice.id);
    expect(Number(allocs[0].appliedAmount)).toBe(100);
  });

  // ---------------------------------------------------------
  // 2) Überzahlung: Zahlung > Rechnung
  // ---------------------------------------------------------
  test('verteilt Überzahlung korrekt (150 → 100 + 50 unallocated)', async () => {
    const tenant = await createTenant({ unitId });
    await createInvoice({ tenantId: tenant.id, gesamtbetrag: 100 });
    const payment = await createPayment({ tenantId: tenant.id, amount: 150 });

    const result = await paymentService.allocatePayment({
      paymentId: payment.id as string,
      tenantId: tenant.id as string,
      amount: 150,
    });

    expect(result.applied).toBe(100);
    expect(result.unapplied).toBe(50);

    const allocs = await db.select().from(paymentAllocations);
    expect(allocs.length).toBe(1);
    expect(Number(allocs[0].appliedAmount)).toBe(100);
  });

  // ---------------------------------------------------------
  // 3) Unterzahlung: Zahlung < Rechnung
  // ---------------------------------------------------------
  test('Teilzahlung wird korrekt zugeordnet (60 → 100)', async () => {
    const tenant = await createTenant({ unitId });
    const invoice = await createInvoice({ tenantId: tenant.id, gesamtbetrag: 100 });
    const payment = await createPayment({ tenantId: tenant.id, amount: 60 });

    const result = await paymentService.allocatePayment({
      paymentId: payment.id as string,
      tenantId: tenant.id as string,
      amount: 60,
    });

    expect(result.applied).toBe(60);
    expect(result.unapplied).toBe(0);

    const allocs = await db.select().from(paymentAllocations);
    expect(allocs.length).toBe(1);
    expect(Number(allocs[0].appliedAmount)).toBe(60);

    const inv = await db.execute(sql`
      SELECT status, paid_amount FROM monthly_invoices WHERE id = ${invoice.id}
    `).then(r => r.rows[0]);
    expect(inv.status).toBe('teilbezahlt');
    expect(Number(inv.paid_amount)).toBe(60);
  });

  // ---------------------------------------------------------
  // 4) FIFO: Mehrere Rechnungen
  // ---------------------------------------------------------
  test('FIFO-Zuordnung über mehrere Rechnungen (250 → 100 + 100 + 50 Rest)', async () => {
    const tenant = await createTenant({ unitId });
    const inv1 = await createInvoice({ tenantId: tenant.id, gesamtbetrag: 100, month: 1, year: 2025 });
    const inv2 = await createInvoice({ tenantId: tenant.id, gesamtbetrag: 100, month: 2, year: 2025 });
    await createInvoice({ tenantId: tenant.id, gesamtbetrag: 100, month: 3, year: 2025 });
    const payment = await createPayment({ tenantId: tenant.id, amount: 250 });

    const result = await paymentService.allocatePayment({
      paymentId: payment.id as string,
      tenantId: tenant.id as string,
      amount: 250,
    });

    expect(result.applied).toBe(250);
    expect(result.unapplied).toBe(0);

    const allocs = await db.select().from(paymentAllocations);
    expect(allocs.length).toBe(3);

    // First two fully paid
    const status1 = await db.execute(sql`SELECT status FROM monthly_invoices WHERE id = ${inv1.id}`).then(r => r.rows[0]);
    const status2 = await db.execute(sql`SELECT status FROM monthly_invoices WHERE id = ${inv2.id}`).then(r => r.rows[0]);
    expect(status1.status).toBe('bezahlt');
    expect(status2.status).toBe('bezahlt');
  });

  // ---------------------------------------------------------
  // 5) Keine offenen Rechnungen
  // ---------------------------------------------------------
  test('Zahlung ohne offene Rechnungen ist vollständig unallocated', async () => {
    const tenant = await createTenant({ unitId });
    const payment = await createPayment({ tenantId: tenant.id, amount: 200 });

    const result = await paymentService.allocatePayment({
      paymentId: payment.id as string,
      tenantId: tenant.id as string,
      amount: 200,
    });

    expect(result.applied).toBe(0);
    expect(result.unapplied).toBe(200);

    const allocs = await db.select().from(paymentAllocations);
    expect(allocs.length).toBe(0);
  });
});
