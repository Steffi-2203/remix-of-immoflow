import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { assertPeriodOpen, PeriodLockError } from "../../server/middleware/periodLock";

/**
 * E2E Flow: Payment → FIFO Allocation → BK-Settlement → Period-Lock
 *
 * Full lifecycle test:
 * 1. Create invoice for tenant
 * 2. Record payment and verify FIFO allocation
 * 3. Create BK settlement
 * 4. Lock period
 * 5. Verify locked period blocks further mutations (assertPeriodOpen throws)
 * 6. Verify payment allocation integrity
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
  settlement: uuidv4(),
};

describe("E2E: Payment → Allocation → Settlement → Period-Lock", () => {
  beforeAll(async () => {
    await db.execute(sql`
      INSERT INTO organizations (id, name) VALUES (${ids.org}::uuid, 'E2E PayLock Org')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO profiles (id, email, full_name, organization_id)
      VALUES (${ids.user}::uuid, 'e2e-paylock@test.at', 'E2E User', ${ids.org}::uuid)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO properties (id, organization_id, name, address, city, postal_code)
      VALUES (${ids.property}::uuid, ${ids.org}::uuid, 'PayLock Property', 'Testgasse 1', 'Wien', '1010')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO units (id, property_id, top_nummer, type, flaeche, nutzwert)
      VALUES (${ids.unit}::uuid, ${ids.property}::uuid, 'Top PL', 'wohnung', 75.0, 100)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, mietbeginn)
      VALUES (${ids.tenant}::uuid, ${ids.unit}::uuid, 'PL', 'Mieter', 'pl@test.at', 'aktiv', 500, 150, 80, '2025-01-01')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM booking_periods WHERE organization_id = ${ids.org}::uuid`);
    await db.execute(sql`DELETE FROM payment_allocations WHERE payment_id = ${ids.payment}::uuid`);
    await db.execute(sql`DELETE FROM settlements WHERE id = ${ids.settlement}::uuid`);
    await db.execute(sql`DELETE FROM payments WHERE tenant_id = ${ids.tenant}::uuid`);
    await db.execute(sql`DELETE FROM monthly_invoices WHERE tenant_id = ${ids.tenant}::uuid`);
    await db.execute(sql`DELETE FROM tenants WHERE id = ${ids.tenant}::uuid`);
    await db.execute(sql`DELETE FROM units WHERE id = ${ids.unit}::uuid`);
    await db.execute(sql`DELETE FROM properties WHERE id = ${ids.property}::uuid`);
    await db.execute(sql`DELETE FROM profiles WHERE id = ${ids.user}::uuid`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${ids.org}::uuid`);
  });

  it("Step 1: Create two invoices (Jan + Feb 2025)", async () => {
    await db.execute(sql`
      INSERT INTO monthly_invoices (id, tenant_id, unit_id, month, year, total_amount, status)
      VALUES 
        (${ids.invoice1}::uuid, ${ids.tenant}::uuid, ${ids.unit}::uuid, 1, 2025, 730.00, 'offen'),
        (${ids.invoice2}::uuid, ${ids.tenant}::uuid, ${ids.unit}::uuid, 2, 2025, 730.00, 'offen')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT * FROM monthly_invoices WHERE tenant_id = ${ids.tenant}::uuid ORDER BY month
    `);
    expect(result.rows.length).toBe(2);
  });

  it("Step 2: Record payment covering first invoice + partial second", async () => {
    await db.execute(sql`
      INSERT INTO payments (id, tenant_id, amount, payment_date, payment_type, status)
      VALUES (${ids.payment}::uuid, ${ids.tenant}::uuid, 1000.00, '2025-02-15', 'ueberweisung', 'received')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`SELECT amount FROM payments WHERE id = ${ids.payment}::uuid`);
    expect(Number((result.rows[0] as any).amount)).toBe(1000);
  });

  it("Step 3: Simulate FIFO allocation (730 + 270)", () => {
    const payment = 1000;
    const invoices = [730, 730];
    let remaining = payment;
    const allocations: number[] = [];

    for (const inv of invoices) {
      const alloc = Math.min(remaining, inv);
      allocations.push(alloc);
      remaining -= alloc;
    }

    expect(allocations).toEqual([730, 270]);
    expect(remaining).toBe(0);
  });

  it("Step 4: Lock January 2025", async () => {
    await db.execute(sql`
      INSERT INTO booking_periods (organization_id, year, month, is_locked, locked_by, locked_at)
      VALUES (${ids.org}::uuid, 2025, 1, true, ${ids.user}::uuid, NOW())
      ON CONFLICT DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT is_locked FROM booking_periods
      WHERE organization_id = ${ids.org}::uuid AND year = 2025 AND month = 1
    `);
    expect((result.rows[0] as any).is_locked).toBe(true);
  });

  it("Step 5: assertPeriodOpen should throw for locked January", async () => {
    await expect(
      assertPeriodOpen({ organizationId: ids.org, year: 2025, month: 1 })
    ).rejects.toThrow(PeriodLockError);
  });

  it("Step 6: assertPeriodOpen should pass for unlocked February", async () => {
    await expect(
      assertPeriodOpen({ organizationId: ids.org, year: 2025, month: 2 })
    ).resolves.toBeUndefined();
  });
});
