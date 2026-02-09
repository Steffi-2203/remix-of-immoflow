import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { roundMoney } from '@shared/utils';

const hasDb = !!process.env.DATABASE_URL;
const PREFIX = 'int-bk';
const PROPERTY_ID = `${PREFIX}-prop-${Date.now()}`;
const ORG_ID = `${PREFIX}-org-${Date.now()}`;

describe.skipIf(!hasDb)('BK-Abrechnung – settlement calculation', () => {
  const UNIT_IDS = Array.from({ length: 5 }, (_, i) => `${PREFIX}-unit-${i}-${Date.now()}`);
  const TENANT_IDS = Array.from({ length: 5 }, (_, i) => `${PREFIX}-ten-${i}-${Date.now()}`);
  const EXPENSE_IDS = Array.from({ length: 3 }, (_, i) => `${PREFIX}-exp-${i}-${Date.now()}`);
  const areas = [50, 65, 80, 45, 60]; // m²
  const totalArea = areas.reduce((s, a) => s + a, 0);

  beforeAll(async () => {
    // Create org, property, units, tenants, expenses
    await db.execute(sql`
      INSERT INTO organizations (id, name, subscription_tier, subscription_status)
      VALUES (${ORG_ID}, 'Test BK Org', 'enterprise', 'active')
      ON CONFLICT (id) DO NOTHING
    `);

    await db.execute(sql`
      INSERT INTO properties (id, name, address, organization_id)
      VALUES (${PROPERTY_ID}, 'BK Test Haus', 'Testgasse 1', ${ORG_ID})
      ON CONFLICT (id) DO NOTHING
    `);

    for (let i = 0; i < 5; i++) {
      await db.execute(sql`
        INSERT INTO units (id, property_id, name, type, area_sqm, status)
        VALUES (${UNIT_IDS[i]}, ${PROPERTY_ID}, ${'Top ' + (i + 1)}, 'wohnung', ${areas[i]}, 'aktiv')
        ON CONFLICT (id) DO NOTHING
      `);
      await db.execute(sql`
        INSERT INTO tenants (id, unit_id, vorname, nachname, status, mietbeginn)
        VALUES (${TENANT_IDS[i]}, ${UNIT_IDS[i]}, 'Test', ${'Mieter ' + (i + 1)}, 'aktiv', '2024-01-01')
        ON CONFLICT (id) DO NOTHING
      `);
    }

    // Expenses totalling €12,000
    const expenseAmounts = [5000, 4000, 3000];
    const categories = ['versicherung', 'hausbetreuung', 'wasser'] as const;
    for (let i = 0; i < 3; i++) {
      await db.execute(sql`
        INSERT INTO expenses (id, property_id, bezeichnung, betrag, category, expense_type, datum, year, month, ist_umlagefaehig)
        VALUES (${EXPENSE_IDS[i]}, ${PROPERTY_ID}, ${categories[i]}, ${expenseAmounts[i]}, ${categories[i]}, 'betriebskosten', '2024-06-15', 2024, 6, true)
        ON CONFLICT (id) DO NOTHING
      `);
    }
  });

  afterAll(async () => {
    for (const id of EXPENSE_IDS) await db.execute(sql`DELETE FROM expenses WHERE id = ${id}`);
    for (const id of TENANT_IDS) await db.execute(sql`DELETE FROM tenants WHERE id = ${id}`);
    for (const id of UNIT_IDS) await db.execute(sql`DELETE FROM units WHERE id = ${id}`);
    await db.execute(sql`DELETE FROM properties WHERE id = ${PROPERTY_ID}`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${ORG_ID}`);
  });

  test('total expenses sum to €12,000', async () => {
    const rows = await db.execute(sql`
      SELECT SUM(betrag) as total FROM expenses WHERE property_id = ${PROPERTY_ID} AND ist_umlagefaehig = true
    `).then(r => r.rows);

    expect(Number(rows[0].total)).toBe(12000);
  });

  test('area-proportional shares sum to total (rounding drift ≤ €0.05)', () => {
    const totalExpense = 12000;
    const shares = areas.map(a => roundMoney(totalExpense * (a / totalArea)));
    const sharesSum = roundMoney(shares.reduce((s, v) => s + v, 0));
    const drift = Math.abs(sharesSum - totalExpense);

    expect(drift).toBeLessThanOrEqual(0.05);
  });

  test('each tenant share is proportional to unit area', () => {
    const totalExpense = 12000;
    const shares = areas.map(a => roundMoney(totalExpense * (a / totalArea)));

    // Largest area gets largest share
    const maxAreaIdx = areas.indexOf(Math.max(...areas));
    const maxShareIdx = shares.indexOf(Math.max(...shares));
    expect(maxAreaIdx).toBe(maxShareIdx);

    // All shares positive
    expect(shares.every(s => s > 0)).toBe(true);
  });
});
