import { describe, it, expect } from 'vitest';
import { roundMoney } from '../../shared/utils';

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function calculateProRata(monthlyRent: number, startDay: number, endDay: number, daysInMonth: number): number {
  if (monthlyRent <= 0) return 0;
  const days = endDay - startDay + 1;
  if (days <= 0) return 0;
  return roundMoney((monthlyRent * days) / daysInMonth);
}

function calculateMoveInProRata(monthlyRent: number, moveInDate: Date): number {
  const year = moveInDate.getFullYear();
  const month = moveInDate.getMonth() + 1;
  const startDay = moveInDate.getDate();
  const dim = getDaysInMonth(year, month);
  return calculateProRata(monthlyRent, startDay, dim, dim);
}

function calculateMoveOutProRata(monthlyRent: number, moveOutDate: Date): number {
  const year = moveOutDate.getFullYear();
  const month = moveOutDate.getMonth() + 1;
  const endDay = moveOutDate.getDate();
  const dim = getDaysInMonth(year, month);
  return calculateProRata(monthlyRent, 1, endDay, dim);
}

describe('Pro-Rata (Aliquote) Billing', () => {
  it('full month (start day 1, end day 31) = full rent', () => {
    expect(calculateProRata(1000, 1, 31, 31)).toBe(1000);
  });

  it('move-in on 15th of 30-day month = 16/30 * rent', () => {
    const result = calculateMoveInProRata(900, new Date(2026, 3, 15));
    expect(result).toBe(roundMoney(900 * 16 / 30));
  });

  it('move-in on 1st = full rent', () => {
    const result = calculateMoveInProRata(1000, new Date(2026, 0, 1));
    expect(result).toBe(1000);
  });

  it('move-out on last day = full rent', () => {
    const result = calculateMoveOutProRata(1000, new Date(2026, 0, 31));
    expect(result).toBe(1000);
  });

  it('move-out on 15th of 31-day month = 15/31 * rent', () => {
    const result = calculateMoveOutProRata(1000, new Date(2026, 0, 15));
    expect(result).toBe(roundMoney(1000 * 15 / 31));
  });

  it('move-in on 29th Feb (leap year 2024)', () => {
    const result = calculateMoveInProRata(900, new Date(2024, 1, 29));
    expect(result).toBe(roundMoney(900 * 1 / 29));
  });

  it('February non-leap year (28 days)', () => {
    const result = calculateMoveInProRata(900, new Date(2025, 1, 15));
    const dim = getDaysInMonth(2025, 2);
    expect(dim).toBe(28);
    expect(result).toBe(roundMoney(900 * 14 / 28));
  });

  it('move-in and move-out same month (tenant stays 10 days)', () => {
    const result = calculateProRata(900, 10, 19, 30);
    expect(result).toBe(roundMoney(900 * 10 / 30));
  });

  it('tenant changeover: old tenant 1-15, new tenant 16-30', () => {
    const oldTenantRent = calculateProRata(900, 1, 15, 30);
    const newTenantRent = calculateProRata(900, 16, 30, 30);
    expect(roundMoney(oldTenantRent + newTenantRent)).toBe(900);
  });

  it('pro-rata with very small rent (€1 - cent precision)', () => {
    const result = calculateProRata(1, 1, 15, 30);
    expect(result).toBe(0.5);
  });

  it('pro-rata with large rent (€5000)', () => {
    const result = calculateProRata(5000, 16, 31, 31);
    expect(result).toBe(roundMoney(5000 * 16 / 31));
  });

  it('getDaysInMonth for all months', () => {
    const expected = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let m = 1; m <= 12; m++) {
      expect(getDaysInMonth(2025, m)).toBe(expected[m - 1]);
    }
  });

  it('getDaysInMonth leap year 2024 Feb = 29', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
  });

  it('getDaysInMonth non-leap 2025 Feb = 28', () => {
    expect(getDaysInMonth(2025, 2)).toBe(28);
  });

  it('zero rent returns 0', () => {
    expect(calculateProRata(0, 1, 15, 30)).toBe(0);
  });

  it('negative days handled gracefully (returns 0)', () => {
    expect(calculateProRata(1000, 20, 10, 30)).toBe(0);
  });
});
