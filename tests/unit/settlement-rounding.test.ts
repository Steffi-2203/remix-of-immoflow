import { describe, test, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Settlement Rounding Integrity Tests
 * Validates that tenant share calculations using roundMoney
 * don't accumulate cent-level drift across many tenants.
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

describe('Settlement Rounding – Drift Control', () => {
  test('10 tenants: drift ≤ 0.10€', () => {
    const areas = [55, 72, 48, 90, 63, 81, 44, 67, 58, 76];
    const { drift } = calculateTenantShares(12345.67, areas);
    expect(Math.abs(drift)).toBeLessThanOrEqual(0.10);
  });

  test('50 tenants: drift ≤ 0.50€', () => {
    const areas = Array.from({ length: 50 }, (_, i) => 30 + (i * 3 % 80));
    const { drift } = calculateTenantShares(98765.43, areas);
    expect(Math.abs(drift)).toBeLessThanOrEqual(0.50);
  });

  test('100 tenants: drift ≤ 1.00€', () => {
    const areas = Array.from({ length: 100 }, (_, i) => 25 + (i * 7 % 120));
    const { drift } = calculateTenantShares(234567.89, areas);
    expect(Math.abs(drift)).toBeLessThanOrEqual(1.00);
  });

  test('equal areas → equal shares, no drift', () => {
    // 10 units each 50m² → exactly 1/10 each
    const areas = Array(10).fill(50);
    const { shares, drift } = calculateTenantShares(10000, areas);
    expect(shares.every(s => s === 1000)).toBe(true);
    expect(drift).toBe(0);
  });

  test('uneven division produces predictable rounding', () => {
    // 3 units dividing 100€ → 33.33 + 33.33 + 33.33 = 99.99 → 1 cent drift
    const areas = [1, 1, 1];
    const { shares, drift } = calculateTenantShares(100, areas);
    expect(shares).toEqual([33.33, 33.33, 33.33]);
    expect(drift).toBe(-0.01);
  });

  test('single tenant gets 100%', () => {
    const { shares, drift } = calculateTenantShares(12345.67, [80]);
    expect(shares).toEqual([12345.67]);
    expect(drift).toBe(0);
  });
});

describe('Settlement Rounding – Category Accumulation', () => {
  test('multiple categories per tenant: sum is stable', () => {
    // Simulate 6 expense categories distributed to one tenant (40% share)
    const categories = [2400, 1800, 1200, 3600, 2400, 600];
    const tenantRatio = 0.4;

    const categoryShares = categories.map(c => roundMoney(c * tenantRatio));
    const totalShare = roundMoney(categoryShares.reduce((s, v) => s + v, 0));
    const expectedTotal = roundMoney(categories.reduce((s, v) => s + v, 0) * tenantRatio);

    // Drift from category-level rounding should be minimal
    expect(Math.abs(totalShare - expectedTotal)).toBeLessThanOrEqual(0.06);
  });

  test('intermediate rounding matches final round', () => {
    // Ensure roundMoney(a) + roundMoney(b) ≈ roundMoney(a + b)
    const a = 123.456;
    const b = 789.123;
    const sumRounded = roundMoney(roundMoney(a) + roundMoney(b));
    const roundedSum = roundMoney(a + b);
    expect(Math.abs(sumRounded - roundedSum)).toBeLessThanOrEqual(0.01);
  });
});
