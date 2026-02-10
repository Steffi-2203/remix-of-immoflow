import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { assertOrgOwnership, OrgOwnershipError } from '../../server/middleware/assertOrgOwnership';

// Two completely separate organizations
const orgA = {
  id: uuidv4(),
  name: 'Org A – Hausverwaltung Alpha',
  propertyId: uuidv4(),
  unitId: uuidv4(),
  tenantId: uuidv4(),
  bankAccountId: uuidv4(),
  userId: uuidv4(),
};

const orgB = {
  id: uuidv4(),
  name: 'Org B – Hausverwaltung Beta',
  propertyId: uuidv4(),
  unitId: uuidv4(),
  tenantId: uuidv4(),
  bankAccountId: uuidv4(),
  userId: uuidv4(),
};

async function seedOrg(org: typeof orgA) {
  await db.execute(sql`
    INSERT INTO organizations (id, name, created_at)
    VALUES (${org.id}::uuid, ${org.name}, NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  await db.execute(sql`
    INSERT INTO profiles (id, email, full_name, organization_id, created_at)
    VALUES (${org.userId}::uuid, ${org.userId + '@test.at'}, 'User ' || ${org.name}, ${org.id}::uuid, NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  await db.execute(sql`
    INSERT INTO properties (id, organization_id, name, address, city, postal_code, created_at)
    VALUES (${org.propertyId}::uuid, ${org.id}::uuid, 'Property ' || ${org.name}, 'Teststraße 1', 'Wien', '1010', NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  await db.execute(sql`
    INSERT INTO units (id, property_id, top_nummer, type, stockwerk, flaeche, created_at)
    VALUES (${org.unitId}::uuid, ${org.propertyId}::uuid, 'Top 1', 'wohnung', 1, 65, NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  await db.execute(sql`
    INSERT INTO tenants (id, unit_id, first_name, last_name, email, status, grundmiete, mietbeginn, created_at)
    VALUES (${org.tenantId}::uuid, ${org.unitId}::uuid, 'Mieter', ${org.name}, 'mieter-' || ${org.id} || '@test.at', 'aktiv', 500, '2025-01-01', NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  await db.execute(sql`
    INSERT INTO bank_accounts (id, organization_id, account_name, created_at)
    VALUES (${org.bankAccountId}::uuid, ${org.id}::uuid, 'Konto ' || ${org.name}, NOW())
    ON CONFLICT (id) DO NOTHING
  `);
}

async function cleanupOrg(org: typeof orgA) {
  await db.execute(sql`DELETE FROM tenants WHERE id = ${org.tenantId}::uuid`);
  await db.execute(sql`DELETE FROM units WHERE id = ${org.unitId}::uuid`);
  await db.execute(sql`DELETE FROM bank_accounts WHERE id = ${org.bankAccountId}::uuid`);
  await db.execute(sql`DELETE FROM properties WHERE id = ${org.propertyId}::uuid`);
  await db.execute(sql`DELETE FROM profiles WHERE id = ${org.userId}::uuid`);
  await db.execute(sql`DELETE FROM organizations WHERE id = ${org.id}::uuid`);
}

describe('Cross-Tenant Isolation', () => {
  beforeAll(async () => {
    await seedOrg(orgA);
    await seedOrg(orgB);
  });

  afterAll(async () => {
    await cleanupOrg(orgA);
    await cleanupOrg(orgB);
  });

  // ── Own resources: must succeed ─────────────────────────────────

  test('Org A can access own property', async () => {
    const result = await assertOrgOwnership({
      organizationId: orgA.id,
      resourceId: orgA.propertyId,
      table: 'properties',
    });
    expect(result).toBeDefined();
    expect((result as any).id).toBe(orgA.propertyId);
  });

  test('Org A can access own unit', async () => {
    const result = await assertOrgOwnership({
      organizationId: orgA.id,
      resourceId: orgA.unitId,
      table: 'units',
    });
    expect(result).toBeDefined();
  });

  test('Org A can access own tenant', async () => {
    const result = await assertOrgOwnership({
      organizationId: orgA.id,
      resourceId: orgA.tenantId,
      table: 'tenants',
    });
    expect(result).toBeDefined();
  });

  test('Org A can access own bank account', async () => {
    const result = await assertOrgOwnership({
      organizationId: orgA.id,
      resourceId: orgA.bankAccountId,
      table: 'bank_accounts',
    });
    expect(result).toBeDefined();
  });

  // ── Cross-org access: must fail with 404 ────────────────────────

  test('Org A CANNOT access Org B property', async () => {
    await expect(
      assertOrgOwnership({
        organizationId: orgA.id,
        resourceId: orgB.propertyId,
        table: 'properties',
      })
    ).rejects.toThrow(OrgOwnershipError);
  });

  test('Org A CANNOT access Org B unit', async () => {
    await expect(
      assertOrgOwnership({
        organizationId: orgA.id,
        resourceId: orgB.unitId,
        table: 'units',
      })
    ).rejects.toThrow(OrgOwnershipError);
  });

  test('Org A CANNOT access Org B tenant', async () => {
    await expect(
      assertOrgOwnership({
        organizationId: orgA.id,
        resourceId: orgB.tenantId,
        table: 'tenants',
      })
    ).rejects.toThrow(OrgOwnershipError);
  });

  test('Org A CANNOT access Org B bank account', async () => {
    await expect(
      assertOrgOwnership({
        organizationId: orgA.id,
        resourceId: orgB.bankAccountId,
        table: 'bank_accounts',
      })
    ).rejects.toThrow(OrgOwnershipError);
  });

  // ── Non-existent resources: must fail with 404 ──────────────────

  test('Random UUID returns 404', async () => {
    await expect(
      assertOrgOwnership({
        organizationId: orgA.id,
        resourceId: uuidv4(),
        table: 'properties',
      })
    ).rejects.toThrow(OrgOwnershipError);
  });

  // ── Missing organizationId: must fail with 403 ─────────────────

  test('Empty organizationId throws 403', async () => {
    try {
      await assertOrgOwnership({
        organizationId: '',
        resourceId: orgA.propertyId,
        table: 'properties',
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(OrgOwnershipError);
      expect((err as OrgOwnershipError).status).toBe(403);
    }
  });

  // ── Bidirectional: B cannot access A either ─────────────────────

  test('Org B CANNOT access Org A property', async () => {
    await expect(
      assertOrgOwnership({
        organizationId: orgB.id,
        resourceId: orgA.propertyId,
        table: 'properties',
      })
    ).rejects.toThrow(OrgOwnershipError);
  });

  test('Org B CANNOT access Org A tenant', async () => {
    await expect(
      assertOrgOwnership({
        organizationId: orgB.id,
        resourceId: orgA.tenantId,
        table: 'tenants',
      })
    ).rejects.toThrow(OrgOwnershipError);
  });
});
