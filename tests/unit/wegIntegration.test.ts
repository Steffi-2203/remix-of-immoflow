import { describe, test, expect } from 'vitest';
import { roundMoney } from '@shared/utils';
import {
  calculateMonthlyDistribution,
  checkMinReserve,
  type WegBusinessPlanItem,
} from '../../src/hooks/useWegBusinessPlan';

/**
 * WEG Wirtschaftsplan Integration Tests
 * Tests calculateMonthlyDistribution with realistic multi-owner scenarios.
 */

function makeOwners(entries: { id: string; mea: number }[]) {
  return entries.map(e => ({
    ownerId: e.id,
    ownerName: `Owner ${e.id}`,
    unitId: `unit-${e.id}`,
    mea: e.mea,
    qm: e.mea,
  }));
}

function makePlanItem(overrides: Partial<WegBusinessPlanItem> & { annual_amount: number; category: string }): WegBusinessPlanItem {
  return {
    id: overrides.id || 'item-1',
    business_plan_id: 'plan-1',
    description: 'Test',
    tax_rate: 10,
    distribution_key: 'mea',
    created_at: new Date().toISOString(),
    ...overrides,
  } as WegBusinessPlanItem;
}

describe('WEG Integration – Realistic 10-owner building', () => {
  const owners = makeOwners([
    { id: 'A', mea: 85 },
    { id: 'B', mea: 120 },
    { id: 'C', mea: 95 },
    { id: 'D', mea: 110 },
    { id: 'E', mea: 70 },
    { id: 'F', mea: 130 },
    { id: 'G', mea: 65 },
    { id: 'H', mea: 100 },
    { id: 'I', mea: 90 },
    { id: 'J', mea: 135 },
  ]);
  // Total MEA = 1000

  const items: WegBusinessPlanItem[] = [
    makePlanItem({ id: 'bk', annual_amount: 48000, category: 'betriebskosten', tax_rate: 10 }),
    makePlanItem({ id: 'vw', annual_amount: 12000, category: 'verwaltung', tax_rate: 20 }),
    makePlanItem({ id: 'rl', annual_amount: 10800, category: 'ruecklage', tax_rate: 0 }),
    makePlanItem({ id: 'hz', annual_amount: 24000, category: 'heizung', tax_rate: 20 }),
    makePlanItem({ id: 'ws', annual_amount: 6000, category: 'wasser', tax_rate: 10 }),
  ];

  const result = calculateMonthlyDistribution(items, owners);

  test('returns result for each owner', () => {
    expect(result).toHaveLength(10);
  });

  test('total monthly net equals sum of non-reserve items / 12', () => {
    const nonReserveAnnual = 48000 + 12000 + 24000 + 6000; // 90000
    const expectedMonthlyNet = roundMoney(nonReserveAnnual / 12); // 7500
    const actualNetSum = roundMoney(result.reduce((s, r) => s + r.monthlyNet, 0));
    expect(actualNetSum).toBe(expectedMonthlyNet);
  });

  test('total monthly reserve equals reserve / 12', () => {
    const expectedReserve = roundMoney(10800 / 12); // 900
    const actualReserve = roundMoney(result.reduce((s, r) => s + r.reserveContribution, 0));
    expect(actualReserve).toBe(expectedReserve);
  });

  test('owner F (130/1000 = 13%) gets correct share', () => {
    const ownerF = result.find(r => r.ownerId === 'F')!;
    // Non-reserve monthly total: 7500 * 0.13 = 975
    expect(ownerF.monthlyNet).toBe(975);
    // Reserve: 900 * 0.13 = 117
    expect(ownerF.reserveContribution).toBe(117);
  });

  test('gross = net + tax + reserve for each owner', () => {
    for (const r of result) {
      expect(r.monthlyGross).toBe(roundMoney(r.monthlyNet + r.monthlyTax + r.reserveContribution));
    }
  });

  test('min reserve check for 1000 qm', () => {
    const reserveCheck = checkMinReserve(10800, 1000);
    expect(reserveCheck.ok).toBe(true);
    expect(reserveCheck.perQmMonth).toBe(0.9); // exactly at minimum
  });

  test('min reserve fails if reduced', () => {
    const reserveCheck = checkMinReserve(9600, 1000);
    expect(reserveCheck.ok).toBe(false);
    expect(reserveCheck.perQmMonth).toBe(0.8);
  });
});

describe('WEG Integration – Edge case: single owner', () => {
  const owners = makeOwners([{ id: 'solo', mea: 500 }]);

  test('single owner gets 100% of everything', () => {
    const items = [
      makePlanItem({ annual_amount: 12000, category: 'betriebskosten', tax_rate: 10 }),
      makePlanItem({ id: 'r', annual_amount: 3600, category: 'ruecklage', tax_rate: 0 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);
    expect(result).toHaveLength(1);
    expect(result[0].monthlyNet).toBe(1000);
    expect(result[0].reserveContribution).toBe(300);
  });
});

describe('WEG Integration – Mixed tax rates', () => {
  const owners = makeOwners([
    { id: 'A', mea: 200 },
    { id: 'B', mea: 300 },
  ]);

  test('tax correctly applied per item category', () => {
    const items = [
      makePlanItem({ id: 'bk', annual_amount: 6000, category: 'betriebskosten', tax_rate: 10 }),
      makePlanItem({ id: 'vw', annual_amount: 3000, category: 'verwaltung', tax_rate: 20 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);
    const ownerA = result.find(r => r.ownerId === 'A')!;
    // A = 200/500 = 40%
    // BK: 6000/12 * 0.4 = 200, tax = 200 * 0.10 = 20
    // VW: 3000/12 * 0.4 = 100, tax = 100 * 0.20 = 20
    expect(ownerA.monthlyNet).toBe(300);
    expect(ownerA.monthlyTax).toBe(40);
  });
});
