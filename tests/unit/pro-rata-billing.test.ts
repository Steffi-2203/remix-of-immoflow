import { describe, it, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Pro-Rata (Aliquot) Billing Tests
 * Mid-month move-in/out, leap year, edge cases.
 */

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function proRataAmount(monthlyAmount: number, year: number, month: number, fromDay: number, toDay: number): number {
  const totalDays = daysInMonth(year, month);
  const activeDays = Math.max(0, Math.min(toDay, totalDays) - fromDay + 1);
  return roundMoney(monthlyAmount * (activeDays / totalDays));
}

describe('Pro-Rata Billing – Move-In', () => {
  it('move-in on 1st = full month', () => {
    expect(proRataAmount(900, 2026, 1, 1, 31)).toBe(900);
  });

  it('move-in on 15th January', () => {
    // 17 days out of 31
    expect(proRataAmount(930, 2026, 1, 15, 31)).toBe(roundMoney(930 * (17 / 31)));
  });

  it('move-in on last day = 1 day', () => {
    expect(proRataAmount(900, 2026, 3, 31, 31)).toBe(roundMoney(900 / 31));
  });

  it('move-in mid-February (non-leap)', () => {
    expect(proRataAmount(600, 2025, 2, 15, 28)).toBe(roundMoney(600 * (14 / 28)));
  });

  it('move-in mid-February (leap year)', () => {
    expect(proRataAmount(600, 2028, 2, 15, 29)).toBe(roundMoney(600 * (15 / 29)));
  });
});

describe('Pro-Rata Billing – Move-Out', () => {
  it('move-out on last day = full month', () => {
    expect(proRataAmount(900, 2026, 6, 1, 30)).toBe(900);
  });

  it('move-out on 15th', () => {
    expect(proRataAmount(900, 2026, 6, 1, 15)).toBe(roundMoney(900 * (15 / 30)));
  });

  it('move-out on 1st = 1 day', () => {
    expect(proRataAmount(900, 2026, 1, 1, 1)).toBe(roundMoney(900 / 31));
  });
});

describe('Pro-Rata – Leap Year Handling', () => {
  it('2024 is a leap year', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it('2025 is not a leap year', () => {
    expect(isLeapYear(2025)).toBe(false);
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it('2000 is a leap year (divisible by 400)', () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  it('1900 is not a leap year (divisible by 100 but not 400)', () => {
    expect(isLeapYear(1900)).toBe(false);
  });

  it('February pro-rata differs between leap and non-leap', () => {
    const nonLeap = proRataAmount(840, 2025, 2, 1, 14);
    const leap = proRataAmount(840, 2028, 2, 1, 14);
    expect(nonLeap).not.toBe(leap);
    // 14/28 vs 14/29
    expect(nonLeap).toBe(420); // exactly half
    expect(leap).toBe(roundMoney(840 * 14 / 29));
  });
});

describe('Pro-Rata – Edge Cases', () => {
  it('fromDay > toDay = 0 amount', () => {
    expect(proRataAmount(900, 2026, 1, 20, 10)).toBe(0);
  });

  it('toDay beyond month end is capped', () => {
    // June has 30 days, toDay=31 should cap to 30
    expect(proRataAmount(900, 2026, 6, 1, 31)).toBe(900);
  });

  it('full year pro-rata sum ≈ 12 × monthly', () => {
    const monthly = 750;
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const days = daysInMonth(2026, m);
      total = roundMoney(total + proRataAmount(monthly, 2026, m, 1, days));
    }
    expect(total).toBe(roundMoney(monthly * 12));
  });

  it('zero monthly amount = zero pro-rata', () => {
    expect(proRataAmount(0, 2026, 5, 10, 20)).toBe(0);
  });
});
