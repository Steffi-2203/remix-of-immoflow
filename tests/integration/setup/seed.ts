import { db, sql } from './db';

interface SeedOrgParams {
  id: string;
  name?: string;
}

interface SeedPropertyParams {
  id: string;
  organizationId: string;
  name?: string;
  address?: string;
}

interface SeedUnitParams {
  id: string;
  propertyId: string;
  name?: string;
  type?: string;
  areaSqm?: number;
}

interface SeedTenantParams {
  id: string;
  unitId: string;
  firstName?: string;
  lastName?: string;
  grundmiete?: number;
  betriebskostenVorschuss?: number;
  heizkostenVorschuss?: number;
  mietbeginn?: string;
}

interface SeedInvoiceParams {
  id: string;
  tenantId: string;
  month: number;
  year: number;
  gesamtbetrag: number;
  paidAmount?: number;
  status?: string;
  faelligAm?: string;
}

interface SeedExpenseParams {
  id: string;
  propertyId: string;
  bezeichnung: string;
  betrag: number;
  category: string;
  expenseType?: string;
  datum?: string;
  year: number;
  month: number;
  istUmlagefaehig?: boolean;
}

export async function seedOrg({ id, name = 'Test Org' }: SeedOrgParams) {
  await db.execute(sql`
    INSERT INTO organizations (id, name, subscription_tier, subscription_status)
    VALUES (${id}, ${name}, 'enterprise', 'active')
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function seedProperty({ id, organizationId, name = 'Test Property', address = 'Testgasse 1' }: SeedPropertyParams) {
  await db.execute(sql`
    INSERT INTO properties (id, name, address, organization_id)
    VALUES (${id}, ${name}, ${address}, ${organizationId})
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function seedUnit({ id, propertyId, name = 'Top 1', type = 'wohnung', areaSqm = 65 }: SeedUnitParams) {
  await db.execute(sql`
    INSERT INTO units (id, property_id, name, type, area_sqm, status)
    VALUES (${id}, ${propertyId}, ${name}, ${type}, ${areaSqm}, 'aktiv')
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function seedTenant({
  id, unitId, firstName = 'Test', lastName = 'Mieter',
  grundmiete = 650, betriebskostenVorschuss = 120,
  heizkostenVorschuss = 80, mietbeginn = '2024-01-01',
}: SeedTenantParams) {
  await db.execute(sql`
    INSERT INTO tenants (id, unit_id, vorname, nachname, status, mietbeginn,
      grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss)
    VALUES (${id}, ${unitId}, ${firstName}, ${lastName}, 'aktiv', ${mietbeginn},
      ${grundmiete}, ${betriebskostenVorschuss}, ${heizkostenVorschuss})
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function seedInvoice({
  id, tenantId, month, year, gesamtbetrag,
  paidAmount = 0, status = 'offen', faelligAm,
}: SeedInvoiceParams) {
  const due = faelligAm ?? `${year}-${String(month).padStart(2, '0')}-05`;
  await db.execute(sql`
    INSERT INTO monthly_invoices (id, tenant_id, month, year, gesamtbetrag, paid_amount, status, faellig_am, created_at)
    VALUES (${id}, ${tenantId}, ${month}, ${year}, ${gesamtbetrag}, ${paidAmount}, ${status}, ${due}, now())
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function seedExpense({
  id, propertyId, bezeichnung, betrag, category,
  expenseType = 'betriebskosten', datum, year, month,
  istUmlagefaehig = true,
}: SeedExpenseParams) {
  const d = datum ?? `${year}-${String(month).padStart(2, '0')}-15`;
  await db.execute(sql`
    INSERT INTO expenses (id, property_id, bezeichnung, betrag, category, expense_type, datum, year, month, ist_umlagefaehig)
    VALUES (${id}, ${propertyId}, ${bezeichnung}, ${betrag}, ${category}, ${expenseType}, ${d}, ${year}, ${month}, ${istUmlagefaehig})
    ON CONFLICT (id) DO NOTHING
  `);
}

/**
 * Seed a complete test portfolio: org → property → units → tenants.
 */
export async function seedPortfolio(prefix: string, unitCount: number, areas?: number[]) {
  const orgId = `${prefix}-org-${Date.now()}`;
  const propId = `${prefix}-prop-${Date.now()}`;
  const unitIds: string[] = [];
  const tenantIds: string[] = [];
  const defaultAreas = areas ?? Array.from({ length: unitCount }, (_, i) => 50 + i * 10);

  await seedOrg({ id: orgId });
  await seedProperty({ id: propId, organizationId: orgId });

  for (let i = 0; i < unitCount; i++) {
    const uid = `${prefix}-unit-${i}-${Date.now()}`;
    const tid = `${prefix}-ten-${i}-${Date.now()}`;
    unitIds.push(uid);
    tenantIds.push(tid);
    await seedUnit({ id: uid, propertyId: propId, name: `Top ${i + 1}`, areaSqm: defaultAreas[i] });
    await seedTenant({ id: tid, unitId: uid, lastName: `Mieter ${i + 1}` });
  }

  return { orgId, propId, unitIds, tenantIds };
}

// ---------------------------------------------------------------------------
// Factory helpers – insert & return the created row
// ---------------------------------------------------------------------------

export async function createTenant(data: Partial<SeedTenantParams> & { unitId: string }) {
  const id = data.id ?? `fac-ten-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row = await db.execute(sql`
    INSERT INTO tenants (id, unit_id, vorname, nachname, status, mietbeginn,
      grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss)
    VALUES (
      ${id}, ${data.unitId},
      ${data.firstName ?? 'Test'}, ${data.lastName ?? 'Mieter'},
      'aktiv', ${data.mietbeginn ?? '2024-01-01'},
      ${data.grundmiete ?? 650}, ${data.betriebskostenVorschuss ?? 120}, ${data.heizkostenVorschuss ?? 80}
    )
    RETURNING *
  `).then(r => r.rows[0]);
  return row;
}

export async function createInvoice(data: Partial<SeedInvoiceParams> & { tenantId: string }) {
  const id = data.id ?? `fac-inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const month = data.month ?? 1;
  const year = data.year ?? 2025;
  const due = data.faelligAm ?? `${year}-${String(month).padStart(2, '0')}-05`;
  const row = await db.execute(sql`
    INSERT INTO monthly_invoices (id, tenant_id, month, year, gesamtbetrag, paid_amount, status, faellig_am, created_at)
    VALUES (${id}, ${data.tenantId}, ${month}, ${year}, ${data.gesamtbetrag ?? 100}, ${data.paidAmount ?? 0}, ${data.status ?? 'offen'}, ${due}, now())
    RETURNING *
  `).then(r => r.rows[0]);
  return row;
}

export async function createPayment(data: { tenantId: string; amount?: number; bookingDate?: string }) {
  const id = `fac-pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row = await db.execute(sql`
    INSERT INTO payments (id, tenant_id, betrag, buchungs_datum, payment_type, created_at)
    VALUES (${id}, ${data.tenantId}, ${data.amount ?? 100}, ${data.bookingDate ?? sql`now()::date`}, 'ueberweisung', now())
    RETURNING *
  `).then(r => r.rows[0]);
  return row;
}

// ---------------------------------------------------------------------------
// Batch convenience helpers for tests
// ---------------------------------------------------------------------------

/**
 * Seed N units (with org, property, and tenants) in one call.
 * Returns all created IDs.
 */
export async function seedUnits(count: number, options?: { propertyId?: string; orgId?: string }) {
  const ts = Date.now();
  const orgId = options?.orgId ?? `batch-org-${ts}`;
  const propId = options?.propertyId ?? `batch-prop-${ts}`;

  if (!options?.orgId) await seedOrg({ id: orgId });
  if (!options?.propertyId) await seedProperty({ id: propId, organizationId: orgId });

  const unitIds: string[] = [];
  const tenantIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const uid = `batch-unit-${i}-${ts}`;
    const tid = `batch-ten-${i}-${ts}`;
    unitIds.push(uid);
    tenantIds.push(tid);
    await seedUnit({ id: uid, propertyId: propId, name: `Top ${i + 1}`, areaSqm: 50 + i * 5 });
    await seedTenant({ id: tid, unitId: uid, lastName: `Mieter ${i + 1}` });
  }

  return { orgId, propId, unitIds, tenantIds };
}

/**
 * Seed expenses for a property.
 */
export async function seedExpenses(
  items: Array<{ type: string; amount: number }>,
  options?: { propertyId?: string; year?: number; month?: number }
) {
  const ts = Date.now();
  const propertyId = options?.propertyId ?? `batch-prop-${ts}`;
  const year = options?.year ?? 2024;
  const month = options?.month ?? 6;

  const ids: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const id = `batch-exp-${i}-${ts}`;
    ids.push(id);
    await seedExpense({
      id,
      propertyId,
      bezeichnung: items[i].type,
      betrag: items[i].amount,
      category: items[i].type,
      year,
      month,
      istUmlagefaehig: !['instandhaltung', 'reparatur', 'finanzierung', 'ruecklage'].includes(items[i].type),
    });
  }

  return ids;
}
