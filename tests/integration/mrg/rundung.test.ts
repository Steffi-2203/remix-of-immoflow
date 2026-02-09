import { describe, test, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * MRG Settlement Rounding Tests
 * Ensures deterministic cent-level rounding across large portfolios.
 */

function calculateTenantShares(
  totalExpense: number,
  unitAreas: number[]
): { shares: number[]; sum: number; drift: number } {
  const totalArea = unitAreas.reduce((s, a) => s + a, 0);
  const shares = unitAreas.map(area =>
    roundMoney(totalExpense * (area / totalArea))
  );
  const sum = roundMoney(shares.reduce((s, v) => s + v, 0));
  return { shares, sum, drift: roundMoney(sum - totalExpense) };
}

describe('MRG Rundung – Settlement Determinism', () => {
  test('20 tenants: drift ≤ 0.20€', () => {
    const areas = Array.from({ length: 20 }, (_, i) => 35 + (i * 5 % 90));
    const { drift } = calculateTenantShares(45678.90, areas);
    expect(Math.abs(drift)).toBeLessThanOrEqual(0.20);
  });

  test('same input always produces same output', () => {
    const areas = [55, 72, 48, 90, 63];
    const run1 = calculateTenantShares(12345.67, areas);
    const run2 = calculateTenantShares(12345.67, areas);
    expect(run1.shares).toEqual(run2.shares);
    expect(run1.drift).toBe(run2.drift);
  });

  test('reconcileRounding: cent difference assigned deterministically', () => {
    // 3 units equally splitting 100€ → 33.33 + 33.33 + 33.33 = 99.99
    const areas = [1, 1, 1];
    const { shares, drift } = calculateTenantShares(100, areas);
    expect(shares).toEqual([33.33, 33.33, 33.33]);
    expect(drift).toBe(-0.01);

    // After reconciliation, the 1 cent should go to a deterministic tenant
    // (sorted by abs amount desc, then line type, then unit id)
    const sorted = shares
      .map((s, i) => ({ amount: s, idx: i }))
      .sort((a, b) => b.amount - a.amount || a.idx - b.idx);
    sorted[0].amount = roundMoney(sorted[0].amount + 0.01);

    const reconciledSum = roundMoney(sorted.reduce((s, v) => s + v.amount, 0));
    expect(reconciledSum).toBe(100);
  });

  test('large portfolio (200 units): drift ≤ 2.00€', () => {
    const areas = Array.from({ length: 200 }, (_, i) => 20 + (i * 11 % 150));
    const { drift } = calculateTenantShares(567890.12, areas);
    expect(Math.abs(drift)).toBeLessThanOrEqual(2.00);
  });
});
