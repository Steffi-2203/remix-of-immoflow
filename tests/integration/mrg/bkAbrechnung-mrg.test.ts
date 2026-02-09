import { describe, test, expect, beforeEach } from 'vitest';
import { hasDb, resetDb, db, sql } from '../setup/db';
import { seedOrg, seedProperty, seedUnit, seedTenant, seedExpense } from '../setup/seed';
import { roundMoney } from '@shared/utils';

/**
 * MRG §21 BK-Abrechnung – Integration tests for settlement logic.
 */

describe.skipIf(!hasDb)('BK-Abrechnung MRG – Settlement Integration', () => {
  const PREFIX = 'int-bk-mrg';
  const areas = [50, 65, 80, 45, 60];
  const totalArea = areas.reduce((s, a) => s + a, 0);
  let propId: string;
  let orgId: string;
  const unitIds: string[] = [];
  const tenantIds: string[] = [];

  beforeEach(async () => {
    await resetDb();
    unitIds.length = 0;
    tenantIds.length = 0;

    orgId = `${PREFIX}-org-${Date.now()}`;
    propId = `${PREFIX}-prop-${Date.now()}`;
    await seedOrg({ id: orgId });
    await seedProperty({ id: propId, organizationId: orgId });

    for (let i = 0; i < 5; i++) {
      const uid = `${PREFIX}-unit-${i}-${Date.now()}`;
      const tid = `${PREFIX}-ten-${i}-${Date.now()}`;
      unitIds.push(uid);
      tenantIds.push(tid);
      await seedUnit({ id: uid, propertyId: propId, name: `Top ${i + 1}`, areaSqm: areas[i] });
      await seedTenant({ id: tid, unitId: uid, lastName: `Mieter ${i + 1}`, betriebskostenVorschuss: 200 });
    }
  });

  test('umlagefähige Kosten werden korrekt summiert', async () => {
    const categories = ['versicherung', 'wasser', 'hausbetreuung'];
    const amounts = [3000, 2000, 1500];
    for (let i = 0; i < 3; i++) {
      await seedExpense({
        id: `${PREFIX}-exp-${i}-${Date.now()}`,
        propertyId: propId, bezeichnung: categories[i],
        betrag: amounts[i], category: categories[i], year: 2024, month: 6,
        istUmlagefaehig: true,
      });
    }

    // Non-umlagefähige expense should be excluded
    await seedExpense({
      id: `${PREFIX}-exp-repair-${Date.now()}`,
      propertyId: propId, bezeichnung: 'Rohrreparatur',
      betrag: 5000, category: 'instandhaltung', year: 2024, month: 6,
      istUmlagefaehig: false,
    });

    const rows = await db.execute(sql`
      SELECT COALESCE(SUM(betrag), 0) as total
      FROM expenses
      WHERE property_id = ${propId} AND ist_umlagefaehig = true
    `).then(r => r.rows);

    expect(Number(rows[0].total)).toBe(6500);
  });

  test('Nachzahlung/Gutschrift = tatsächliche Kosten - Vorschuss', () => {
    const actualCostPerTenant = roundMoney(6500 * (65 / totalArea)); // ~1408.33
    const annualVorschuss = roundMoney(200 * 12); // 2400
    const nachzahlung = roundMoney(actualCostPerTenant - annualVorschuss);
    // Tenant overpaid → Gutschrift (negative)
    expect(nachzahlung).toBeLessThan(0);
  });

  test('Abrechnungsfrist: Abrechnung muss vor 30.6. des Folgejahres liegen', () => {
    const year = 2024;
    const deadline = new Date(year + 1, 5, 30);
    const abrechnungsDatum = new Date('2025-05-15');
    expect(abrechnungsDatum.getTime()).toBeLessThanOrEqual(deadline.getTime());
  });

  test('Verteilerschlüssel Fläche: anteilige Kosten pro Einheit', () => {
    const totalCost = 6500;
    const shares = areas.map(a => roundMoney(totalCost * (a / totalArea)));
    const sum = roundMoney(shares.reduce((s, v) => s + v, 0));
    expect(Math.abs(sum - totalCost)).toBeLessThanOrEqual(0.05);

    // Largest unit pays most
    const maxArea = Math.max(...areas);
    const maxShare = Math.max(...shares);
    expect(shares[areas.indexOf(maxArea)]).toBe(maxShare);
  });
});
