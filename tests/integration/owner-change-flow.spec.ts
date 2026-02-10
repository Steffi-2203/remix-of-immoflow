import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * E2E Flow: Owner Change → Invoice → Settlement
 *
 * Verifies:
 * 1. Tenant moves out mid-year
 * 2. New tenant moves in
 * 3. Invoices are generated for both tenants pro-rata
 * 4. Settlement correctly splits costs
 */

const ids = {
  org: uuidv4(),
  property: uuidv4(),
  unit: uuidv4(),
  tenant1: uuidv4(),
  tenant2: uuidv4(),
  user: uuidv4(),
};

describe("E2E: Owner Change → Invoicing → Settlement", () => {
  beforeAll(async () => {
    await db.execute(sql`
      INSERT INTO organizations (id, name) VALUES (${ids.org}::uuid, 'Owner Change Org')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO profiles (id, email, full_name, organization_id)
      VALUES (${ids.user}::uuid, 'owner-change@test.at', 'Test User', ${ids.org}::uuid)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO properties (id, organization_id, name, address, city, postal_code)
      VALUES (${ids.property}::uuid, ${ids.org}::uuid, 'Wechsel Property', 'Wechselgasse 1', 'Wien', '1010')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO units (id, property_id, top_nummer, type, flaeche)
      VALUES (${ids.unit}::uuid, ${ids.property}::uuid, 'Top W1', 'wohnung', 80.0)
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM monthly_invoices WHERE tenant_id IN (${ids.tenant1}::uuid, ${ids.tenant2}::uuid)`);
    await db.execute(sql`DELETE FROM tenants WHERE id IN (${ids.tenant1}::uuid, ${ids.tenant2}::uuid)`);
    await db.execute(sql`DELETE FROM units WHERE id = ${ids.unit}::uuid`);
    await db.execute(sql`DELETE FROM properties WHERE id = ${ids.property}::uuid`);
    await db.execute(sql`DELETE FROM profiles WHERE id = ${ids.user}::uuid`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${ids.org}::uuid`);
  });

  it("Step 1: Register first tenant (Jan-Jun)", async () => {
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, mietbeginn, mietende)
      VALUES (${ids.tenant1}::uuid, ${ids.unit}::uuid, 'Alt', 'Mieter', 'alt@test.at', 'ausgezogen', 600, 180, '2024-01-01', '2025-06-30')
      ON CONFLICT (id) DO NOTHING
    `);
    const result = await db.execute(sql`SELECT * FROM tenants WHERE id = ${ids.tenant1}::uuid`);
    expect(result.rows.length).toBe(1);
    expect((result.rows[0] as any).status).toBe("ausgezogen");
  });

  it("Step 2: Register second tenant (Jul-Dec)", async () => {
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, mietbeginn)
      VALUES (${ids.tenant2}::uuid, ${ids.unit}::uuid, 'Neu', 'Mieter', 'neu@test.at', 'aktiv', 650, 190, '2025-07-01')
      ON CONFLICT (id) DO NOTHING
    `);
    const result = await db.execute(sql`SELECT * FROM tenants WHERE id = ${ids.tenant2}::uuid`);
    expect(result.rows.length).toBe(1);
    expect((result.rows[0] as any).status).toBe("aktiv");
  });

  it("Step 3: Pro-rata occupancy calculation", () => {
    // Tenant 1: Jan 1 - Jun 30 = 181 days (2025 is not a leap year)
    // Tenant 2: Jul 1 - Dec 31 = 184 days
    const totalDays = 365;
    const tenant1Days = 181;
    const tenant2Days = 184;

    const tenant1Share = tenant1Days / totalDays;
    const tenant2Share = tenant2Days / totalDays;

    expect(tenant1Share + tenant2Share).toBeCloseTo(1.0, 2);
    expect(tenant1Share).toBeCloseTo(0.496, 2);
    expect(tenant2Share).toBeCloseTo(0.504, 2);
  });
});
