import { describe, test, expect } from 'vitest';
import {
  calculateOccupancyDays,
  calculateProRataShares,
  calculateMonthlyProRata,
} from '../../server/billing/proRataCalculator';

describe('ProRataCalculator', () => {
  test('full year occupancy = 365 days', () => {
    const days = calculateOccupancyDays(
      new Date(2026, 0, 1),
      null,
      new Date(2026, 0, 1),
      new Date(2026, 11, 31)
    );
    expect(days).toBe(365);
  });

  test('mid-year move-in calculates correct days', () => {
    const days = calculateOccupancyDays(
      new Date(2026, 6, 1), // July 1
      null,
      new Date(2026, 0, 1),
      new Date(2026, 11, 31)
    );
    expect(days).toBe(184); // Jul 1 to Dec 31
  });

  test('tenant change mid-year splits costs proportionally', () => {
    const { tenantShares, ownerShare, vacancyDays } = calculateProRataShares(
      [
        { tenantId: 'tenant-a', moveIn: new Date(2026, 0, 1), moveOut: new Date(2026, 5, 30) },
        { tenantId: 'tenant-b', moveIn: new Date(2026, 6, 1), moveOut: null },
      ],
      12000,
      2026
    );

    expect(tenantShares).toHaveLength(2);
    const sum = tenantShares.reduce((s, t) => s + t.amount, 0) + ownerShare;
    expect(sum).toBeCloseTo(12000, 1);
    expect(vacancyDays).toBe(0);
  });

  test('vacancy period allocates to owner', () => {
    const { tenantShares, ownerShare, vacancyDays } = calculateProRataShares(
      [
        { tenantId: 'tenant-a', moveIn: new Date(2026, 0, 1), moveOut: new Date(2026, 2, 31) },
        { tenantId: 'tenant-b', moveIn: new Date(2026, 6, 1), moveOut: null },
      ],
      12000,
      2026
    );

    expect(vacancyDays).toBeGreaterThan(0);
    expect(ownerShare).toBeGreaterThan(0);
    const sum = tenantShares.reduce((s, t) => s + t.amount, 0) + ownerShare;
    expect(sum).toBeCloseTo(12000, 1);
  });

  test('monthly pro-rata for mid-month move-in', () => {
    const amount = calculateMonthlyProRata(
      new Date(2026, 5, 15), // June 15
      null,
      2026,
      6,
      900
    );
    expect(amount).toBeCloseTo(480, 0);
  });

  test('full month occupancy returns full amount', () => {
    const amount = calculateMonthlyProRata(
      new Date(2025, 0, 1),
      null,
      2026,
      3,
      750
    );
    expect(amount).toBe(750);
  });
});
