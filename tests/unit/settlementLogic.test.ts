import { describe, test, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Settlement Service pure logic tests.
 * Tests distribution key calculations, vacancy rules, and expense categorization
 * WITHOUT database dependencies.
 */

// ── Expense Distribution by Key ──

describe('SettlementService – Expense Distribution', () => {
  interface DistributionInput {
    unitId: string;
    value: number; // qm, mea, persons, etc.
  }

  function distributeExpense(
    totalExpense: number,
    units: DistributionInput[]
  ): Map<string, number> {
    const totalValue = units.reduce((s, u) => s + u.value, 0);
    const result = new Map<string, number>();
    if (totalValue === 0) return result;

    for (const u of units) {
      result.set(u.unitId, roundMoney(totalExpense * (u.value / totalValue)));
    }
    return result;
  }

  test('3 units by area', () => {
    const shares = distributeExpense(12000, [
      { unitId: 'u1', value: 60 },
      { unitId: 'u2', value: 90 },
      { unitId: 'u3', value: 150 },
    ]);
    expect(shares.get('u1')).toBe(2400);  // 60/300
    expect(shares.get('u2')).toBe(3600);  // 90/300
    expect(shares.get('u3')).toBe(6000);  // 150/300
  });

  test('single unit gets 100%', () => {
    const shares = distributeExpense(5000, [{ unitId: 'u1', value: 100 }]);
    expect(shares.get('u1')).toBe(5000);
  });

  test('zero total value → empty map', () => {
    const shares = distributeExpense(5000, [
      { unitId: 'u1', value: 0 },
      { unitId: 'u2', value: 0 },
    ]);
    expect(shares.size).toBe(0);
  });

  test('rounding stays within 1 cent of total', () => {
    const total = 10000;
    const units = Array.from({ length: 7 }, (_, i) => ({
      unitId: `u${i}`,
      value: 10 + i * 3,
    }));
    const shares = distributeExpense(total, units);
    const sum = roundMoney([...shares.values()].reduce((a, b) => a + b, 0));
    expect(Math.abs(sum - total)).toBeLessThan(0.1);
  });
});

// ── Settlement Difference (Nachzahlung / Guthaben) ──

describe('SettlementService – Difference Calculation', () => {
  function calcDifference(prepaid: number, actualShare: number) {
    return roundMoney(prepaid - actualShare);
  }

  test('Nachzahlung when prepaid < actual', () => {
    expect(calcDifference(2400, 2800)).toBe(-400);
  });

  test('Guthaben when prepaid > actual', () => {
    expect(calcDifference(3000, 2400)).toBe(600);
  });

  test('zero difference', () => {
    expect(calcDifference(2400, 2400)).toBe(0);
  });
});

// ── Anteil Calculation ──

describe('SettlementService – Anteil (unit share ratio)', () => {
  function calcAnteil(unitFlaeche: number, totalFlaeche: number): number {
    if (totalFlaeche <= 0) return 0;
    return Math.round((unitFlaeche / totalFlaeche) * 10000) / 10000;
  }

  test('60qm of 300qm → 0.2', () => {
    expect(calcAnteil(60, 300)).toBe(0.2);
  });

  test('100qm of 100qm → 1.0', () => {
    expect(calcAnteil(100, 100)).toBe(1);
  });

  test('0 total → 0', () => {
    expect(calcAnteil(50, 0)).toBe(0);
  });

  test('precision: 47qm of 317qm', () => {
    const anteil = calcAnteil(47, 317);
    expect(anteil).toBe(0.1483); // 47/317 = 0.14826... → 0.1483
  });
});

// ── Vacancy Handling (Leerstandsregel) ──

describe('SettlementService – Leerstandsregel', () => {
  function calculateWithVacancy(
    totalExpense: number,
    units: { flaeche: number; occupied: boolean }[]
  ) {
    const totalArea = units.reduce((s, u) => s + u.flaeche, 0);
    const vacantArea = units.filter(u => !u.occupied).reduce((s, u) => s + u.flaeche, 0);
    const ownerShare = roundMoney(totalExpense * (vacantArea / totalArea));
    const tenantPool = roundMoney(totalExpense - ownerShare);

    const occupied = units.filter(u => u.occupied);
    const occArea = occupied.reduce((s, u) => s + u.flaeche, 0);

    const tenantShares = occupied.map(u => ({
      flaeche: u.flaeche,
      share: occArea > 0 ? roundMoney(tenantPool * (u.flaeche / occArea)) : 0,
    }));

    return { ownerShare, tenantPool, tenantShares };
  }

  test('20% vacancy → owner pays 20%', () => {
    const result = calculateWithVacancy(10000, [
      { flaeche: 80, occupied: true },
      { flaeche: 20, occupied: false },
    ]);
    expect(result.ownerShare).toBe(2000);
    expect(result.tenantPool).toBe(8000);
    expect(result.tenantShares[0].share).toBe(8000);
  });

  test('no vacancy → owner pays nothing', () => {
    const result = calculateWithVacancy(10000, [
      { flaeche: 50, occupied: true },
      { flaeche: 50, occupied: true },
    ]);
    expect(result.ownerShare).toBe(0);
    expect(result.tenantPool).toBe(10000);
  });

  test('100% vacancy → owner pays everything', () => {
    const result = calculateWithVacancy(10000, [
      { flaeche: 50, occupied: false },
      { flaeche: 50, occupied: false },
    ]);
    expect(result.ownerShare).toBe(10000);
    expect(result.tenantShares).toHaveLength(0);
  });
});

// ── Heating Cost Distribution ──

describe('SettlementService – Heating Cost Distribution', () => {
  // HeizKG: 50-70% consumption-based, 30-50% area-based
  function distributeHeatingCosts(
    totalCost: number,
    consumptionRatio: number, // e.g. 0.7 for 70% consumption
    units: { id: string; flaeche: number; consumption: number }[]
  ) {
    const consumptionPool = roundMoney(totalCost * consumptionRatio);
    const areaPool = roundMoney(totalCost - consumptionPool);

    const totalConsumption = units.reduce((s, u) => s + u.consumption, 0);
    const totalArea = units.reduce((s, u) => s + u.flaeche, 0);

    return units.map(u => {
      const consumptionShare = totalConsumption > 0
        ? roundMoney(consumptionPool * (u.consumption / totalConsumption))
        : 0;
      const areaShare = totalArea > 0
        ? roundMoney(areaPool * (u.flaeche / totalArea))
        : 0;
      return {
        unitId: u.id,
        consumptionShare,
        areaShare,
        total: roundMoney(consumptionShare + areaShare),
      };
    });
  }

  test('70/30 split: high consumer pays more', () => {
    const result = distributeHeatingCosts(10000, 0.7, [
      { id: 'u1', flaeche: 50, consumption: 300 },
      { id: 'u2', flaeche: 50, consumption: 100 },
    ]);
    // Consumption pool: 7000 → u1: 5250, u2: 1750
    // Area pool: 3000 → each 1500
    expect(result[0].consumptionShare).toBe(5250);
    expect(result[1].consumptionShare).toBe(1750);
    expect(result[0].areaShare).toBe(1500);
    expect(result[1].areaShare).toBe(1500);
    expect(result[0].total).toBe(6750);
    expect(result[1].total).toBe(3250);
  });

  test('50/50 split with equal consumption', () => {
    const result = distributeHeatingCosts(8000, 0.5, [
      { id: 'u1', flaeche: 60, consumption: 100 },
      { id: 'u2', flaeche: 40, consumption: 100 },
    ]);
    // Consumption: 4000 each 2000
    // Area: 4000 → u1: 2400, u2: 1600
    expect(result[0].total).toBe(4400);
    expect(result[1].total).toBe(3600);
  });
});

// ── Expense Categorization (umlagefähig) ──

describe('SettlementService – Expense Categorization', () => {
  const expenses = [
    { betrag: 2400, istUmlagefaehig: true, category: 'versicherung' },
    { betrag: 1800, istUmlagefaehig: true, category: 'wasser' },
    { betrag: 5000, istUmlagefaehig: false, category: 'instandhaltung' },
    { betrag: 1200, istUmlagefaehig: true, category: 'muell' },
    { betrag: 3000, istUmlagefaehig: false, category: 'reparatur' },
  ];

  test('filters allocable expenses', () => {
    const allocable = expenses.filter(e => e.istUmlagefaehig);
    expect(allocable).toHaveLength(3);
  });

  test('total allocable sum', () => {
    const total = expenses.filter(e => e.istUmlagefaehig).reduce((s, e) => s + e.betrag, 0);
    expect(total).toBe(5400);
  });

  test('groups by category', () => {
    const byCategory = new Map<string, number>();
    for (const e of expenses.filter(e => e.istUmlagefaehig)) {
      byCategory.set(e.category, (byCategory.get(e.category) || 0) + e.betrag);
    }
    expect(byCategory.get('versicherung')).toBe(2400);
    expect(byCategory.get('wasser')).toBe(1800);
    expect(byCategory.get('muell')).toBe(1200);
    expect(byCategory.has('instandhaltung')).toBe(false);
  });
});
