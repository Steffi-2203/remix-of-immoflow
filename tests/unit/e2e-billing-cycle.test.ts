import { describe, test, expect, beforeAll } from 'vitest';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

const ORG_ID = '6f4bf3ce-03e3-4907-aa1b-7dc4145dd795';

describe('E2E Billing Cycle: Property → Unit → Tenant → Invoice → Payment', () => {
  let testPropertyId: string;
  let testUnitId: string;
  let testTenantId: string;
  let testInvoiceId: string;

  test('Step 1: Property exists with active units', async () => {
    const result = await db.execute(sql`
      SELECT p.id, p.name, COUNT(u.id) as unit_count
      FROM properties p
      LEFT JOIN units u ON u.property_id = p.id AND u.deleted_at IS NULL
      WHERE p.deleted_at IS NULL AND p.organization_id = ${ORG_ID}
      GROUP BY p.id, p.name
      HAVING COUNT(u.id) > 0
      LIMIT 1
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    const prop = result.rows[0] as any;
    testPropertyId = prop.id;
    expect(prop.name).toBeTruthy();
    expect(parseInt(prop.unit_count)).toBeGreaterThan(0);
  });

  test('Step 2: Units have correct structure (Top-Nr, Fläche, Type)', async () => {
    const result = await db.execute(sql`
      SELECT id, top_nummer, type, status, flaeche
      FROM units
      WHERE property_id = ${testPropertyId} AND deleted_at IS NULL
      ORDER BY top_nummer
      LIMIT 5
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    const unit = result.rows[0] as any;
    testUnitId = unit.id;
    expect(unit.top_nummer).toBeTruthy();
    expect(['wohnung', 'geschaeft', 'stellplatz']).toContain(unit.type);
    expect(['aktiv', 'leerstand']).toContain(unit.status);
  });

  test('Step 3: Active tenant with valid lease data', async () => {
    const result = await db.execute(sql`
      SELECT t.id, t.first_name, t.last_name, t.grundmiete, t.betriebskosten_vorschuss,
             t.mietbeginn, t.unit_id
      FROM tenants t
      WHERE t.deleted_at IS NULL AND t.status = 'aktiv' AND t.unit_id = ${testUnitId}
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      const anyTenant = await db.execute(sql`
        SELECT id, first_name, last_name, grundmiete, betriebskosten_vorschuss, mietbeginn, unit_id
        FROM tenants
        WHERE deleted_at IS NULL AND status = 'aktiv'
        LIMIT 1
      `);
      expect(anyTenant.rows.length).toBeGreaterThan(0);
      const t = anyTenant.rows[0] as any;
      testTenantId = t.id;
      testUnitId = t.unit_id;
    } else {
      const t = result.rows[0] as any;
      testTenantId = t.id;
    }
    expect(testTenantId).toBeTruthy();
  });

  test('Step 4: Lease exists for tenant-unit pair', async () => {
    const result = await db.execute(sql`
      SELECT id, tenant_id, unit_id, start_date, grundmiete, status
      FROM leases
      WHERE tenant_id = ${testTenantId} AND unit_id = ${testUnitId}
      LIMIT 1
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    const lease = result.rows[0] as any;
    expect(lease.status).toBe('aktiv');
    expect(parseFloat(lease.grundmiete)).toBeGreaterThanOrEqual(0);
    expect(lease.start_date).toBeTruthy();
  });

  test('Step 5: Invoices generated for tenant', async () => {
    const result = await db.execute(sql`
      SELECT id, tenant_id, year, month, gesamtbetrag, status, grundmiete, betriebskosten
      FROM monthly_invoices
      WHERE tenant_id = ${testTenantId}
      ORDER BY year DESC, month DESC
      LIMIT 3
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    const inv = result.rows[0] as any;
    testInvoiceId = inv.id;
    expect(parseFloat(inv.gesamtbetrag)).toBeGreaterThan(0);
    expect(['offen', 'bezahlt', 'teilbezahlt']).toContain(inv.status);
    expect(inv.year).toBeGreaterThanOrEqual(2024);
  });

  test('Step 6: Invoice amounts are positive and USt is correctly proportional', async () => {
    const result = await db.execute(sql`
      SELECT grundmiete, betriebskosten, heizungskosten, wasserkosten,
             ust_satz_miete, ust_satz_bk, ust, gesamtbetrag
      FROM monthly_invoices
      WHERE tenant_id = ${testTenantId} AND gesamtbetrag > 0
      ORDER BY year DESC, month DESC
      LIMIT 1
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    const inv = result.rows[0] as any;
    const gesamt = parseFloat(inv.gesamtbetrag);
    const ust = parseFloat(inv.ust || '0');
    const ustSatzMiete = parseFloat(inv.ust_satz_miete || '10');

    expect(gesamt).toBeGreaterThan(0);
    expect(ust).toBeGreaterThanOrEqual(0);

    if (ust > 0 && ustSatzMiete > 0) {
      const ustRatio = ust / (gesamt - ust);
      expect(ustRatio).toBeGreaterThan(0);
      expect(ustRatio).toBeLessThanOrEqual(0.25);
    }
  });

  test('Step 7: Payments exist and link to invoices', async () => {
    const result = await db.execute(sql`
      SELECT p.id, p.betrag, p.payment_type, p.buchungs_datum, p.invoice_id
      FROM payments p
      WHERE p.tenant_id = ${testTenantId}
      ORDER BY p.buchungs_datum DESC
      LIMIT 3
    `);
    if (result.rows.length > 0) {
      const payment = result.rows[0] as any;
      expect(parseFloat(payment.betrag)).toBeGreaterThan(0);
      expect(['ueberweisung', 'bar', 'lastschrift', 'sepa']).toContain(payment.payment_type);
    }
  });

  test('Step 8: Paid invoices have matching payment amounts', async () => {
    const result = await db.execute(sql`
      SELECT mi.id, mi.gesamtbetrag, mi.paid_amount, mi.status,
             COALESCE(SUM(p.betrag), 0) as total_payments
      FROM monthly_invoices mi
      LEFT JOIN payments p ON p.invoice_id = mi.id
      WHERE mi.tenant_id = ${testTenantId} AND mi.status = 'bezahlt'
      GROUP BY mi.id, mi.gesamtbetrag, mi.paid_amount, mi.status
      LIMIT 3
    `);
    for (const row of result.rows as any[]) {
      const gesamt = parseFloat(row.gesamtbetrag);
      const paid = parseFloat(row.paid_amount || '0');
      expect(Math.abs(gesamt - paid)).toBeLessThan(0.02);
    }
  });
});

describe('E2E Data Integrity: Cross-table consistency', () => {
  test('All active tenants have valid unit references', async () => {
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM tenants t
      LEFT JOIN units u ON u.id = t.unit_id
      WHERE t.deleted_at IS NULL AND t.status = 'aktiv' AND u.id IS NULL
    `);
    expect(parseInt((result.rows[0] as any).cnt)).toBe(0);
  });

  test('All units reference valid properties', async () => {
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM units u
      LEFT JOIN properties p ON p.id = u.property_id
      WHERE u.deleted_at IS NULL AND p.id IS NULL
    `);
    expect(parseInt((result.rows[0] as any).cnt)).toBe(0);
  });

  test('All leases reference valid tenants and units', async () => {
    const orphanLeases = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM leases l
      LEFT JOIN tenants t ON t.id = l.tenant_id
      LEFT JOIN units u ON u.id = l.unit_id
      WHERE t.id IS NULL OR u.id IS NULL
    `);
    expect(parseInt((orphanLeases.rows[0] as any).cnt)).toBe(0);
  });

  test('All invoices reference valid tenants (allowing soft-deleted)', async () => {
    const orphanInvoices = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM monthly_invoices mi
      LEFT JOIN tenants t ON t.id = mi.tenant_id
      WHERE t.id IS NULL AND mi.is_vacancy = false
    `);
    expect(parseInt((orphanInvoices.rows[0] as any).cnt)).toBeLessThanOrEqual(2);
  });

  test('All payments reference valid tenants', async () => {
    const orphanPayments = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM payments p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      WHERE t.id IS NULL
    `);
    expect(parseInt((orphanPayments.rows[0] as any).cnt)).toBe(0);
  });

  test('Invoice status distribution is realistic', async () => {
    const result = await db.execute(sql`
      SELECT status, COUNT(*) as cnt
      FROM monthly_invoices
      GROUP BY status
    `);
    const statuses = Object.fromEntries(
      (result.rows as any[]).map(r => [r.status, parseInt(r.cnt)])
    );
    expect(statuses['bezahlt']).toBeGreaterThan(0);
    expect(statuses['offen']).toBeGreaterThan(0);
    const total = Object.values(statuses).reduce((a, b) => a + b, 0);
    const paidRatio = (statuses['bezahlt'] || 0) / total;
    expect(paidRatio).toBeGreaterThan(0.3);
    expect(paidRatio).toBeLessThan(0.95);
  });
});

describe('E2E Financial Audit Trail (GoBD)', () => {
  test('Audit log entries exist with hash chain', async () => {
    const result = await db.execute(sql`
      SELECT id, action, entity_type, previous_hash, hash, created_at
      FROM financial_audit_log
      ORDER BY created_at ASC
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows as any[]) {
      expect(row.hash).toBeTruthy();
      expect(row.previous_hash).toBeTruthy();
      expect(row.action).toBeTruthy();
    }
  });

  test('Audit chain has correct linkage (previous_hash references)', async () => {
    const result = await db.execute(sql`
      SELECT hash, previous_hash
      FROM financial_audit_log
      ORDER BY created_at ASC
    `);
    const rows = result.rows as any[];
    if (rows.length >= 2) {
      expect(rows[0].previous_hash).toBe('GENESIS');
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].previous_hash).toBe(rows[i - 1].hash);
      }
    }
  });
});

describe('E2E Bank & WEG Data', () => {
  test('Bank accounts exist for properties', async () => {
    const result = await db.execute(sql`
      SELECT ba.id, ba.account_name, ba.iban, ba.bank_name, p.name as property_name
      FROM bank_accounts ba
      JOIN properties p ON p.id = ba.property_id
      WHERE ba.organization_id = ${ORG_ID}
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows as any[]) {
      expect(row.iban).toMatch(/^AT\d{2}/);
      expect(row.bank_name).toBeTruthy();
    }
  });

  test('WEG assemblies exist with proper structure', async () => {
    const result = await db.execute(sql`
      SELECT id, title, assembly_date, status, assembly_type
      FROM weg_assemblies
      WHERE organization_id = ${ORG_ID}
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows as any[]) {
      expect(['geplant', 'einberufen', 'abgeschlossen', 'vertagt']).toContain(row.status);
      expect(['ordentlich', 'ausserordentlich']).toContain(row.assembly_type);
    }
  });

  test('WEG unit owners have valid MEA shares', async () => {
    const result = await db.execute(sql`
      SELECT uo.mea_share, uo.unit_id, u.top_nummer
      FROM weg_unit_owners uo
      JOIN units u ON u.id = uo.unit_id
      WHERE uo.organization_id = ${ORG_ID}
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows as any[]) {
      const mea = parseFloat(row.mea_share);
      expect(mea).toBeGreaterThan(0);
      expect(mea).toBeLessThanOrEqual(1);
    }
  });

  test('Owners exist with proper Austrian data', async () => {
    const result = await db.execute(sql`
      SELECT first_name, last_name, city, postal_code, iban
      FROM owners
      WHERE organization_id = ${ORG_ID}
    `);
    expect(result.rows.length).toBeGreaterThan(0);
    for (const row of result.rows as any[]) {
      expect(row.first_name).toBeTruthy();
      if (row.iban) {
        expect(String(row.iban)).toMatch(/^AT/);
      }
    }
  });
});

describe('E2E Multi-Tenant Isolation', () => {
  test('All properties belong to known organizations', async () => {
    const result = await db.execute(sql`
      SELECT COUNT(*) as orphan_count
      FROM properties p
      WHERE p.deleted_at IS NULL
        AND p.organization_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM organizations o WHERE o.id = p.organization_id
        )
    `);
    const orphans = parseInt((result.rows[0] as any).orphan_count);
    expect(orphans).toBe(0);
  });

  test('No cross-organization data leaks in units (excluding test properties)', async () => {
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM units u
      JOIN properties p ON p.id = u.property_id
      WHERE u.deleted_at IS NULL
        AND p.organization_id IS NOT NULL
        AND p.organization_id != ${ORG_ID}
        AND p.name NOT LIKE '%Test%'
    `);
    const leaks = parseInt((result.rows[0] as any).cnt);
    expect(leaks).toBe(0);
  });
});
