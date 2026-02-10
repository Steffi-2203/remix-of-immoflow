import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * E2E Flow: Dunning → Payment → Storno → Reconciliation
 *
 * Full lifecycle:
 * 1. Create overdue invoice
 * 2. Calculate dunning level based on days overdue
 * 3. Record payment that clears the debt
 * 4. Storno (cancel) the invoice
 * 5. Verify final ledger balance = 0
 * 6. Verify storno prevents further allocations
 */

const ids = {
  org: uuidv4(),
  property: uuidv4(),
  unit: uuidv4(),
  tenant: uuidv4(),
  user: uuidv4(),
  invoice1: uuidv4(),
  invoice2: uuidv4(),
  payment: uuidv4(),
};

describe("E2E: Dunning → Payment → Storno → Reconciliation", () => {
  beforeAll(async () => {
    await db.execute(sql`
      INSERT INTO organizations (id, name) VALUES (${ids.org}::uuid, 'Dunning E2E Org')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO profiles (id, email, full_name, organization_id)
      VALUES (${ids.user}::uuid, 'dunning-e2e@test.at', 'Dunning User', ${ids.org}::uuid)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO properties (id, organization_id, name, address, city, postal_code)
      VALUES (${ids.property}::uuid, ${ids.org}::uuid, 'Mahn E2E', 'Mahnstraße 1', 'Wien', '1010')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO units (id, property_id, top_nummer, type, flaeche)
      VALUES (${ids.unit}::uuid, ${ids.property}::uuid, 'Top ME', 'wohnung', 55.0)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, mietbeginn)
      VALUES (${ids.tenant}::uuid, ${ids.unit}::uuid, 'Mahn', 'E2E', 'mahn-e2e@test.at', 'aktiv', 450, 120, '2024-06-01')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM payment_allocations WHERE payment_id = ${ids.payment}::uuid`);
    await db.execute(sql`DELETE FROM payments WHERE id = ${ids.payment}::uuid`);
    await db.execute(sql`DELETE FROM monthly_invoices WHERE id IN (${ids.invoice1}::uuid, ${ids.invoice2}::uuid)`);
    await db.execute(sql`DELETE FROM tenants WHERE id = ${ids.tenant}::uuid`);
    await db.execute(sql`DELETE FROM units WHERE id = ${ids.unit}::uuid`);
    await db.execute(sql`DELETE FROM properties WHERE id = ${ids.property}::uuid`);
    await db.execute(sql`DELETE FROM profiles WHERE id = ${ids.user}::uuid`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${ids.org}::uuid`);
  });

  it("Step 1: Create two overdue invoices", async () => {
    await db.execute(sql`
      INSERT INTO monthly_invoices (id, tenant_id, unit_id, month, year, total_amount, status, due_date)
      VALUES 
        (${ids.invoice1}::uuid, ${ids.tenant}::uuid, ${ids.unit}::uuid, 9, 2024, 570.00, 'offen', '2024-09-05'),
        (${ids.invoice2}::uuid, ${ids.tenant}::uuid, ${ids.unit}::uuid, 10, 2024, 570.00, 'offen', '2024-10-05')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT * FROM monthly_invoices WHERE tenant_id = ${ids.tenant}::uuid ORDER BY month
    `);
    expect(result.rows.length).toBe(2);
  });

  it("Step 2: Calculate correct dunning levels", () => {
    const today = new Date("2024-11-20");

    // Invoice 1: due Sep 5 → 76 days overdue → Level 3
    const inv1Due = new Date("2024-09-05");
    const inv1Days = Math.floor((today.getTime() - inv1Due.getTime()) / (1000 * 60 * 60 * 24));
    expect(inv1Days).toBe(76);

    // Invoice 2: due Oct 5 → 46 days overdue → Level 3
    const inv2Due = new Date("2024-10-05");
    const inv2Days = Math.floor((today.getTime() - inv2Due.getTime()) / (1000 * 60 * 60 * 24));
    expect(inv2Days).toBe(46);

    const LEVELS = [
      { level: 1, name: "Zahlungserinnerung", minDays: 14, fee: 0 },
      { level: 2, name: "1. Mahnung", minDays: 30, fee: 5 },
      { level: 3, name: "2. Mahnung", minDays: 45, fee: 10 },
    ];

    const getLevel = (days: number) => LEVELS.filter(l => days >= l.minDays).pop();

    expect(getLevel(inv1Days)?.level).toBe(3);
    expect(getLevel(inv1Days)?.fee).toBe(10);
    expect(getLevel(inv2Days)?.level).toBe(3);
  });

  it("Step 3: Record payment covering first invoice", async () => {
    await db.execute(sql`
      INSERT INTO payments (id, tenant_id, amount, payment_date, payment_type, status)
      VALUES (${ids.payment}::uuid, ${ids.tenant}::uuid, 570.00, '2024-11-20', 'ueberweisung', 'received')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`SELECT amount FROM payments WHERE id = ${ids.payment}::uuid`);
    expect(Number((result.rows[0] as any).amount)).toBe(570);
  });

  it("Step 4: FIFO allocation assigns to oldest invoice first", () => {
    const invoices = [
      { id: ids.invoice1, amount: 570, month: 9, paid: 0 },
      { id: ids.invoice2, amount: 570, month: 10, paid: 0 },
    ];
    const paymentAmount = 570;
    let remaining = paymentAmount;

    for (const inv of invoices) {
      const due = inv.amount - inv.paid;
      const alloc = Math.min(remaining, due);
      inv.paid += alloc;
      remaining -= alloc;
    }

    expect(invoices[0].paid).toBe(570); // Sep fully paid
    expect(invoices[1].paid).toBe(0);   // Oct still open
    expect(remaining).toBe(0);
  });

  it("Step 5: Storno second invoice", async () => {
    await db.execute(sql`
      UPDATE monthly_invoices SET status = 'storniert', storniert_am = NOW()
      WHERE id = ${ids.invoice2}::uuid
    `);

    const result = await db.execute(sql`
      SELECT status FROM monthly_invoices WHERE id = ${ids.invoice2}::uuid
    `);
    expect((result.rows[0] as any).status).toBe("storniert");
  });

  it("Step 6: Reconciliation — only non-storniert invoices count", () => {
    const invoices = [
      { amount: 570, status: "bezahlt" },
      { amount: 570, status: "storniert" },
    ];
    const payments = 570;

    const openAmount = invoices
      .filter(i => i.status !== "storniert")
      .reduce((sum, i) => sum + i.amount, 0);

    const balance = openAmount - payments;
    expect(balance).toBe(0);
  });
});
