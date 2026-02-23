import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

const E2E_PREFIX = 'e2e00000';

export const testOrgId = `${E2E_PREFIX}-0000-0000-0000-000000000001`;
export const testPropertyId = `${E2E_PREFIX}-0000-0000-0000-000000000002`;
export const testUnitId = `${E2E_PREFIX}-0000-0000-0000-000000000003`;
export const testTenantId = `${E2E_PREFIX}-0000-0000-0000-000000000004`;
export const testUserId = `${E2E_PREFIX}-0000-0000-0000-000000000005`;
export const testUnit2Id = `${E2E_PREFIX}-0000-0000-0000-000000000006`;
export const testTenant2Id = `${E2E_PREFIX}-0000-0000-0000-000000000007`;

export async function setupTestDb() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invoice_runs (
      id SERIAL PRIMARY KEY,
      run_id UUID UNIQUE NOT NULL,
      period VARCHAR(7) NOT NULL,
      initiated_by UUID,
      status VARCHAR(20) NOT NULL DEFAULT 'started',
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP
    )
  `);
}

export async function teardownTestDb() {
  await db.execute(sql`DELETE FROM payment_allocations WHERE invoice_id IN (SELECT id FROM monthly_invoices WHERE tenant_id IN (${testTenantId}::uuid, ${testTenant2Id}::uuid))`);
  await db.execute(sql`DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM monthly_invoices WHERE tenant_id IN (${testTenantId}::uuid, ${testTenant2Id}::uuid))`);
  await db.execute(sql`DELETE FROM monthly_invoices WHERE tenant_id IN (${testTenantId}::uuid, ${testTenant2Id}::uuid)`);
  await db.execute(sql`DELETE FROM invoice_runs WHERE initiated_by = ${testUserId}::uuid`);
  await db.execute(sql`DELETE FROM audit_logs WHERE user_id = ${testUserId}::uuid`);
  await db.execute(sql`DELETE FROM tenants WHERE id IN (${testTenantId}::uuid, ${testTenant2Id}::uuid)`);
  await db.execute(sql`DELETE FROM units WHERE id IN (${testUnitId}::uuid, ${testUnit2Id}::uuid)`);
  await db.execute(sql`DELETE FROM properties WHERE id = ${testPropertyId}::uuid`);
  await db.execute(sql`DELETE FROM profiles WHERE id = ${testUserId}::uuid`);
  await db.execute(sql`DELETE FROM organizations WHERE id = ${testOrgId}::uuid`);
}

export async function seedTestData() {
  await db.execute(sql`
    INSERT INTO organizations (id, name, created_at)
    VALUES (${testOrgId}::uuid, 'E2E Test Hausverwaltung', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.execute(sql`
    INSERT INTO profiles (id, email, full_name, organization_id, created_at)
    VALUES (${testUserId}::uuid, 'e2e-admin@immoflowme.at', 'E2E Admin', ${testOrgId}::uuid, NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.execute(sql`
    INSERT INTO properties (id, organization_id, name, address, city, postal_code, created_at)
    VALUES (${testPropertyId}::uuid, ${testOrgId}::uuid, 'E2E Testobjekt Waidhofen', 'Hauptplatz 10', 'Waidhofen an der Ybbs', '3340', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.execute(sql`
    INSERT INTO units (id, property_id, top_nummer, type, stockwerk, zimmer, flaeche, created_at)
    VALUES (${testUnitId}::uuid, ${testPropertyId}::uuid, 'Top 1', 'wohnung', 1, 3, 72.50, NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.execute(sql`
    INSERT INTO units (id, property_id, top_nummer, type, stockwerk, zimmer, flaeche, created_at)
    VALUES (${testUnit2Id}::uuid, ${testPropertyId}::uuid, 'Top 2', 'wohnung', 2, 2, 55.00, NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.execute(sql`
    INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, mietbeginn, created_at)
    VALUES (${testTenantId}::uuid, ${testUnitId}::uuid, 'Max', 'Mustermann', 'max.mustermann@test.at', 'aktiv', 650.00, 180.00, 95.00, '2025-01-01', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  await db.execute(sql`
    INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, mietbeginn, created_at)
    VALUES (${testTenant2Id}::uuid, ${testUnit2Id}::uuid, 'Anna', 'Gruber', 'anna.gruber@test.at', 'aktiv', 520.00, 145.00, 75.00, '2025-03-01', NOW())
    ON CONFLICT (id) DO NOTHING
  `);

  return { testOrgId, testPropertyId, testUnitId, testUnit2Id, testTenantId, testTenant2Id, testUserId };
}
