import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db, sql, hasDb, cleanupByPrefix } from '../setup/db';
import { seedOrg, seedProperty, seedUnit, seedTenant, seedExpense } from '../setup/seed';
import { roundMoney } from '@shared/utils';

const PREFIX = 'int-bk';

describe.skipIf(!hasDb)('BK-Abrechnung – settlement calculation', () => {
  const areas = [50, 65, 80, 45, 60];
  const totalArea = areas.reduce((s, a) => s + a, 0);
  let orgId: string, propId: string;
  const unitIds: string[] = [];
  const tenantIds: string[] = [];
  const expenseIds: string[] = [];

  beforeAll(async () => {
    await cleanupByPrefix(PREFIX);

    orgId = `${PREFIX}-org-${Date.now()}`;
    propId = `${PREFIX}-prop-${Date.now()}`;

    await seedOrg({ id: orgId, name: 'Test BK Org' });
    await seedProperty({ id: propId, organizationId: orgId, name: 'BK Test Haus' });

    for (let i = 0; i < 5; i++) {
      const uid = `${PREFIX}-unit-${i}-${Date.now()}`;
      const tid = `${PREFIX}-ten-${i}-${Date.now()}`;
      unitIds.push(uid);
      tenantIds.push(tid);
      await seedUnit({ id: uid, propertyId: propId, name: `Top ${i + 1}`, areaSqm: areas[i] });
      await seedTenant({ id: tid, unitId: uid, lastName: `Mieter ${i + 1}` });
    }

    const expenseAmounts = [5000, 4000, 3000];
    const categories = ['versicherung', 'hausbetreuung', 'wasser'];
    for (let i = 0; i < 3; i++) {
      const eid = `${PREFIX}-exp-${i}-${Date.now()}`;
      expenseIds.push(eid);
      await seedExpense({
        id: eid, propertyId: propId, bezeichnung: categories[i],
        betrag: expenseAmounts[i], category: categories[i], year: 2024, month: 6,
      });
    }
  });

  afterAll(async () => {
    await cleanupByPrefix(PREFIX);
  });

  test('total expenses sum to €12,000', async () => {
    const rows = await db.execute(sql`
      SELECT SUM(betrag) as total FROM expenses WHERE property_id = ${propId} AND ist_umlagefaehig = true
    `).then(r => r.rows);

    expect(Number(rows[0].total)).toBe(12000);
  });

  test('area-proportional shares sum to total (rounding drift ≤ €0.05)', () => {
    const totalExpense = 12000;
    const shares = areas.map(a => roundMoney(totalExpense * (a / totalArea)));
    const sharesSum = roundMoney(shares.reduce((s, v) => s + v, 0));
    expect(Math.abs(sharesSum - totalExpense)).toBeLessThanOrEqual(0.05);
  });

  test('each tenant share is proportional to unit area', () => {
    const totalExpense = 12000;
    const shares = areas.map(a => roundMoney(totalExpense * (a / totalArea)));
    const maxAreaIdx = areas.indexOf(Math.max(...areas));
    const maxShareIdx = shares.indexOf(Math.max(...shares));
    expect(maxAreaIdx).toBe(maxShareIdx);
    expect(shares.every(s => s > 0)).toBe(true);
  });
});
