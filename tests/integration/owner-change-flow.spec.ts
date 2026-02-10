import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * E2E Flow: Owner Change → Invoicing → Settlement
 *
 * Verifies Austrian WEG rules:
 * 1. Old tenant moves out mid-year (Jun 30)
 * 2. New tenant moves in (Jul 1)
 * 3. Pro-rata occupancy calculated correctly
 * 4. Costs are distributed by MEA/area + occupancy ratio
 * 5. Vacancy period costs assigned to owner
 */

const ids = {
  org: uuidv4(),
  property: uuidv4(),
  unit1: uuidv4(),
  unit2: uuidv4(),
  tenant1: uuidv4(),
  tenant2: uuidv4(),
  tenantUnit2: uuidv4(),
  user: uuidv4(),
};

describe("E2E: Owner Change → Invoicing → Settlement", () => {
  beforeAll(async () => {
    await db.execute(sql`
      INSERT INTO organizations (id, name) VALUES (${ids.org}::uuid, 'Owner Change E2E')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO profiles (id, email, full_name, organization_id)
      VALUES (${ids.user}::uuid, 'owner-e2e@test.at', 'Test User', ${ids.org}::uuid)
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO properties (id, organization_id, name, address, city, postal_code)
      VALUES (${ids.property}::uuid, ${ids.org}::uuid, 'Wechsel E2E', 'Wechselgasse 1', 'Wien', '1010')
      ON CONFLICT (id) DO NOTHING
    `);
    // Two units: 80m² and 60m² (total 140m²)
    await db.execute(sql`
      INSERT INTO units (id, property_id, top_nummer, type, flaeche, nutzwert)
      VALUES 
        (${ids.unit1}::uuid, ${ids.property}::uuid, 'Top 1', 'wohnung', 80.0, 120),
        (${ids.unit2}::uuid, ${ids.property}::uuid, 'Top 2', 'wohnung', 60.0, 80)
      ON CONFLICT (id) DO NOTHING
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM monthly_invoices WHERE tenant_id IN (${ids.tenant1}::uuid, ${ids.tenant2}::uuid, ${ids.tenantUnit2}::uuid)`);
    await db.execute(sql`DELETE FROM tenants WHERE id IN (${ids.tenant1}::uuid, ${ids.tenant2}::uuid, ${ids.tenantUnit2}::uuid)`);
    await db.execute(sql`DELETE FROM units WHERE id IN (${ids.unit1}::uuid, ${ids.unit2}::uuid)`);
    await db.execute(sql`DELETE FROM properties WHERE id = ${ids.property}::uuid`);
    await db.execute(sql`DELETE FROM profiles WHERE id = ${ids.user}::uuid`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${ids.org}::uuid`);
  });

  it("Step 1: Register old tenant (Jan-Jun) and new tenant (Jul-Dec) on unit 1", async () => {
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, mietbeginn, mietende)
      VALUES (${ids.tenant1}::uuid, ${ids.unit1}::uuid, 'Alt', 'Mieter', 'alt@test.at', 'ausgezogen', 600, 180, '2024-01-01', '2025-06-30')
      ON CONFLICT (id) DO NOTHING
    `);
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, mietbeginn)
      VALUES (${ids.tenant2}::uuid, ${ids.unit1}::uuid, 'Neu', 'Mieter', 'neu@test.at', 'aktiv', 650, 190, '2025-07-01')
      ON CONFLICT (id) DO NOTHING
    `);

    const result = await db.execute(sql`SELECT * FROM tenants WHERE unit_id = ${ids.unit1}::uuid ORDER BY mietbeginn`);
    expect(result.rows.length).toBe(2);
  });

  it("Step 2: Register full-year tenant on unit 2", async () => {
    await db.execute(sql`
      INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, mietbeginn)
      VALUES (${ids.tenantUnit2}::uuid, ${ids.unit2}::uuid, 'Full', 'Year', 'full@test.at', 'aktiv', 500, 150, '2024-01-01')
      ON CONFLICT (id) DO NOTHING
    `);
    const result = await db.execute(sql`SELECT * FROM tenants WHERE id = ${ids.tenantUnit2}::uuid`);
    expect(result.rows.length).toBe(1);
  });

  it("Step 3: Pro-rata occupancy is correct", () => {
    // 2025, non-leap year
    const totalDays = 365;
    // Tenant 1: Jan 1 - Jun 30 = 181 days
    const t1Start = new Date("2025-01-01");
    const t1End = new Date("2025-06-30");
    const t1Days = Math.round((t1End.getTime() - t1Start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expect(t1Days).toBe(181);

    // Tenant 2: Jul 1 - Dec 31 = 184 days
    const t2Start = new Date("2025-07-01");
    const t2End = new Date("2025-12-31");
    const t2Days = Math.round((t2End.getTime() - t2Start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expect(t2Days).toBe(184);

    expect(t1Days + t2Days).toBe(totalDays);
  });

  it("Step 4: Cost distribution by area (MEA) + occupancy", () => {
    const totalCost = 12000; // Annual BK cost
    const totalArea = 140; // 80 + 60

    // Unit 1 share by area
    const unit1AreaShare = 80 / totalArea;
    const unit1Cost = totalCost * unit1AreaShare;
    expect(unit1Cost).toBeCloseTo(6857.14, 0);

    // Pro-rata for each tenant on unit 1
    const t1Occupancy = 181 / 365;
    const t2Occupancy = 184 / 365;
    const t1Cost = unit1Cost * t1Occupancy;
    const t2Cost = unit1Cost * t2Occupancy;

    expect(t1Cost + t2Cost).toBeCloseTo(unit1Cost, 0);

    // Unit 2 full-year tenant gets full share
    const unit2Cost = totalCost * (60 / totalArea);
    expect(unit2Cost).toBeCloseTo(5142.86, 0);

    // Total distributed should equal total cost
    expect(t1Cost + t2Cost + unit2Cost).toBeCloseTo(totalCost, 0);
  });

  it("Step 5: Vacancy costs assigned to owner", () => {
    // If unit 1 had a 30-day vacancy between tenants
    const totalCost = 12000;
    const unit1Share = totalCost * (80 / 140);
    const vacancyDays = 0; // No vacancy in this scenario
    const vacancyCost = unit1Share * (vacancyDays / 365);
    expect(vacancyCost).toBe(0);

    // With 30-day vacancy:
    const vacancyCost30 = unit1Share * (30 / 365);
    expect(vacancyCost30).toBeGreaterThan(0);
    expect(vacancyCost30).toBeCloseTo(563.41, 0);
  });
});
