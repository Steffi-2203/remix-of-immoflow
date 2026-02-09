import { describe, test, expect, beforeEach } from 'vitest';
import { hasDb, resetDb } from '../setup/db';
import { seedUnits, seedExpenses } from '../setup/seed';
import { bkAbrechnungService } from '../../../server/billing/bkAbrechnungService';

describe.skipIf(!hasDb)('MRG – BK-Abrechnung', () => {
  let orgId: string;
  let propId: string;

  beforeEach(async () => {
    await resetDb();
    const result = await seedUnits(10);
    orgId = result.orgId;
    propId = result.propId;
  });

  test('verteilt umlagefähige Kosten korrekt', async () => {
    await seedExpenses([
      { type: 'verwaltung', amount: 2000 },
      { type: 'versicherung', amount: 3000 },
    ], { propertyId: propId, year: 2024 });

    const result = await bkAbrechnungService.generateBKAbrechnung({
      propertyId: propId, year: 2024, organizationId: orgId,
    });

    expect(result.total).toBe(5000);
    expect(result.items.length).toBe(10);
    // All items should have positive shares
    expect(result.items.every(i => i.sollBetrag > 0)).toBe(true);
  });

  test('nicht-umlagefähige Kosten werden ausgeschlossen', async () => {
    await seedExpenses([
      { type: 'verwaltung', amount: 2000 },
      { type: 'instandhaltung', amount: 3000 }, // NOT umlagefähig
    ], { propertyId: propId, year: 2024 });

    const result = await bkAbrechnungService.generateBKAbrechnung({
      propertyId: propId, year: 2024, organizationId: orgId,
    });

    expect(result.totalUmlagefaehig).toBe(2000);
    expect(result.totalNichtUmlagefaehig).toBe(3000);
    expect(result.total).toBe(2000); // only umlagefähig
  });

  test('Summe aller Mieteranteile ≈ Gesamtkosten', async () => {
    await seedExpenses([
      { type: 'wasser', amount: 4000 },
      { type: 'muell', amount: 2500 },
    ], { propertyId: propId, year: 2024 });

    const result = await bkAbrechnungService.generateBKAbrechnung({
      propertyId: propId, year: 2024, organizationId: orgId,
    });

    const sharesSum = result.items.reduce((s, i) => s + i.sollBetrag, 0);
    expect(Math.abs(sharesSum - result.total)).toBeLessThanOrEqual(0.10);
  });
});
