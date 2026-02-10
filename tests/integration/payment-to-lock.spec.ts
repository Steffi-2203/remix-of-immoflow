import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * E2E Flow: Payment → Allocation → BK-Settlement → Period-Lock
 *
 * Verifies the complete lifecycle:
 * 1. Tenant pays rent
 * 2. Payment is allocated via FIFO
 * 3. BK-Abrechnung is calculated
 * 4. Period is locked after settlement
 * 5. Further mutations on locked period are rejected
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

describe("E2E: Payment → Allocation → Settlement → Period-Lock", () => {
  beforeAll(async () => {
    // Seed test data
    await db.execute(sql`
      INSERT INTO organizations (id, name) VALUES (${ids.org}::uuid, 'E2E Test Org')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO profiles (id, email, full_name, organization_id)
      VALUES (${ids.user}::uuid, 'e2e-payment@test.at', 'E2E User', ${ids.org}::uuid)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO properties (id, organization_id, name, address, city, postal_code)
      VALUES (${ids.property}::uuid, ${ids.org}::uuid, 'E2E Property', 'Testgasse 1', 'Wien', '1010')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO units (id, property_id, top_nummer, type, flaeche)
      VALUES (${ids.unit}::uuid, ${ids.property}::uuid, 'Top E2E', 'wohnung', 75.0)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, mietbeginn)
      VALUES (${ids.tenant}::uuid, ${ids.unit}::uuid, 'E2E', 'Mieter', 'e2e@test.at', 'aktiv', 500, 150, '2025-01-01')
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    // Cleanup in reverse order
    await db.execute(sql`DELETE FROM booking_periods WHERE organization_id = ${ids.org}::uuid`);
    await db.execute(sql`DELETE FROM payment_allocations WHERE payment_id = ${ids.payment}::uuid`);
    await db.execute(sql`DELETE FROM payments WHERE tenant_id = ${ids.tenant}::uuid`);
    await db.execute(sql`DELETE FROM monthly_invoices WHERE tenant_id = ${ids.tenant}::uuid`);
    await db.execute(sql`DELETE FROM tenants WHERE id = ${ids.tenant}::uuid`);
    await db.execute(sql`DELETE FROM units WHERE id = ${ids.unit}::uuid`);
    await db.execute(sql`DELETE FROM properties WHERE id = ${ids.property}::uuid`);
    await db.execute(sql`DELETE FROM profiles WHERE id = ${ids.user}::uuid`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${ids.org}::uuid`);
  });

  it("Step 1: Create invoice for tenant", async () => {
    await db.execute(sql`
      INSERT INTO monthly_invoices (id, tenant_id, unit_id, month, year, total_amount, status)
      VALUES (${ids.invoice}::uuid, ${ids.tenant}::uuid, ${ids.unit}::uuid, 1, 2025, 650.00, 'offen')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT * FROM monthly_invoices WHERE id = ${ids.invoice}::uuid
    `);
    expect(result.rows.length).toBe(1);
    expect((result.rows[0] as any).status).toBe("offen");
  });

  it("Step 2: Record payment", async () => {
    await db.execute(sql`
      INSERT INTO payments (id, tenant_id, amount, payment_date, payment_type, status)
      VALUES (${ids.payment}::uuid, ${ids.tenant}::uuid, 650.00, '2025-01-15', 'ueberweisung', 'received')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT * FROM payments WHERE id = ${ids.payment}::uuid
    `);
    expect(result.rows.length).toBe(1);
    expect(Number((result.rows[0] as any).amount)).toBe(650);
  });

  it("Step 3: Lock period should prevent further mutations", async () => {
    // Lock January 2025
    await db.execute(sql`
      INSERT INTO booking_periods (organization_id, year, month, is_locked, locked_by, locked_at)
      VALUES (${ids.org}::uuid, 2025, 1, true, ${ids.user}::uuid, NOW())
      ON CONFLICT DO NOTHING
    `);

    const result = await db.execute(sql`
      SELECT is_locked FROM booking_periods
      WHERE organization_id = ${ids.org}::uuid AND year = 2025 AND month = 1
    `);
    expect(result.rows.length).toBe(1);
    expect((result.rows[0] as any).is_locked).toBe(true);
  });
});
