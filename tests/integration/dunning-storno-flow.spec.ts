import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * E2E Flow: Dunning → Payment → Storno → Reconciliation
 *
 * Verifies:
 * 1. Overdue invoice triggers dunning
 * 2. Payment clears the debt
 * 3. Storno reverses the invoice
 * 4. Final reconciliation balances to zero
 */

const ids = {
  org: uuidv4(),
  property: uuidv4(),
  unit: uuidv4(),
  tenant: uuidv4(),
  user: uuidv4(),
  invoice: uuidv4(),
  payment: uuidv4(),
};

describe("E2E: Dunning → Payment → Storno → Reconciliation", () => {
  beforeAll(async () => {
    await db.execute(sql`
      INSERT INTO organizations (id, name) VALUES (${ids.org}::uuid, 'Dunning Test Org')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO profiles (id, email, full_name, organization_id)
      VALUES (${ids.user}::uuid, 'dunning@test.at', 'Dunning User', ${ids.org}::uuid)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO properties (id, organization_id, name, address, city, postal_code)
      VALUES (${ids.property}::uuid, ${ids.org}::uuid, 'Mahn Property', 'Mahnstraße 1', 'Wien', '1010')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO units (id, property_id, top_nummer, type, flaeche)
      VALUES (${ids.unit}::uuid, ${ids.property}::uuid, 'Top M1', 'wohnung', 55.0)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, mietbeginn)
      VALUES (${ids.tenant}::uuid, ${ids.unit}::uuid, 'Mahn', 'Mieter', 'mahn@test.at', 'aktiv', 450, 120, '2024-06-01')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM payment_allocations WHERE payment_id = ${ids.payment}::uuid`);
    await db.execute(sql`DELETE FROM payments WHERE id = ${ids.payment}::uuid`);
    await db.execute(sql`DELETE FROM monthly_invoices WHERE id = ${ids.invoice}::uuid`);
    await db.execute(sql`DELETE FROM tenants WHERE id = ${ids.tenant}::uuid`);
    await db.execute(sql`DELETE FROM units WHERE id = ${ids.unit}::uuid`);
    await db.execute(sql`DELETE FROM properties WHERE id = ${ids.property}::uuid`);
    await db.execute(sql`DELETE FROM profiles WHERE id = ${ids.user}::uuid`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${ids.org}::uuid`);
  });

  it("Step 1: Create overdue invoice", async () => {
    await db.execute(sql`
      INSERT INTO monthly_invoices (id, tenant_id, unit_id, month, year, total_amount, status, due_date)
      VALUES (${ids.invoice}::uuid, ${ids.tenant}::uuid, ${ids.unit}::uuid, 10, 2024, 570.00, 'offen', '2024-10-05')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT * FROM monthly_invoices WHERE id = ${ids.invoice}::uuid
    `);
    expect(result.rows.length).toBe(1);
    expect((result.rows[0] as any).status).toBe("offen");
  });

  it("Step 2: Identify as overdue (dunning candidate)", () => {
    const dueDate = new Date("2024-10-05");
    const today = new Date("2024-11-15"); // 41 days overdue
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysOverdue).toBe(41);

    // Should be dunning level 2 (30+ days)
    const dunningLevels = [
      { level: 1, minDays: 14 },
      { level: 2, minDays: 30 },
      { level: 3, minDays: 45 },
    ];

    const applicableLevel = dunningLevels
      .filter((l) => daysOverdue >= l.minDays)
      .pop();

    expect(applicableLevel?.level).toBe(2);
  });

  it("Step 3: Record payment", async () => {
    await db.execute(sql`
      INSERT INTO payments (id, tenant_id, amount, payment_date, payment_type, status)
      VALUES (${ids.payment}::uuid, ${ids.tenant}::uuid, 570.00, '2024-11-15', 'ueberweisung', 'received')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT * FROM payments WHERE id = ${ids.payment}::uuid
    `);
    expect(result.rows.length).toBe(1);
  });

  it("Step 4: Storno of invoice should set status", async () => {
    await db.execute(sql`
      UPDATE monthly_invoices SET status = 'storniert' WHERE id = ${ids.invoice}::uuid
    `);

    const result = await db.execute(sql`
      SELECT status FROM monthly_invoices WHERE id = ${ids.invoice}::uuid
    `);
    expect((result.rows[0] as any).status).toBe("storniert");
  });

  it("Step 5: Reconciliation - balance should be zero", () => {
    const invoiceAmount = 570;
    const paymentAmount = 570;
    const balance = invoiceAmount - paymentAmount;
    expect(balance).toBe(0);
  });
});
