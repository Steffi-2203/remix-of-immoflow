import { describe, test, expect } from 'vitest';
import { roundMoney, roundToCents, parseMoneyInput, formatMoney } from '@shared/utils';

/**
 * Testsuite für shared/utils.ts
 * Single Source of Truth für alle monetären Rundungen.
 */

describe('roundMoney / roundToCents', () => {
  test('rounds to 2 decimal places', () => {
    expect(roundMoney(1.234)).toBe(1.23);
    expect(roundMoney(1.235)).toBe(1.24);
    expect(roundMoney(1.999)).toBe(2);
    expect(roundMoney(0)).toBe(0);
  });

  test('handles floating-point edge cases', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1); // IEEE754: 1.005*100 = 100.4999...
    expect(roundMoney(2.675)).toBe(2.68);
  });

  test('handles negative values', () => {
    expect(roundMoney(-1.234)).toBe(-1.23);
    expect(roundMoney(-0.005)).toBe(-0.01);
  });

  test('handles NaN/undefined gracefully', () => {
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(undefined as any)).toBe(0);
    expect(roundMoney(null as any)).toBe(0);
  });

  test('handles string-like numbers', () => {
    expect(roundMoney('123.456' as any)).toBe(123.46);
    expect(roundMoney('abc' as any)).toBe(0);
  });

  test('roundToCents is alias for roundMoney', () => {
    expect(roundToCents(1.234)).toBe(roundMoney(1.234));
    expect(roundToCents(0.1 + 0.2)).toBe(roundMoney(0.1 + 0.2));
  });

  test('large amounts preserve precision', () => {
    expect(roundMoney(999999.994)).toBe(999999.99);
    expect(roundMoney(999999.995)).toBe(1000000);
  });

  test('deterministic: same input → same output', () => {
    const vals = [1.111, 2.222, 3.333, 99.999, 0.001];
    const run1 = vals.map(roundMoney);
    const run2 = vals.map(roundMoney);
    expect(run1).toEqual(run2);
  });
});

describe('parseMoneyInput', () => {
  test('parses comma-separated German format', () => {
    expect(parseMoneyInput('1.234,56')).toBe(1234.56);
  });

  test('parses dot-separated English format', () => {
    expect(parseMoneyInput('1234.56')).toBe(1234.56);
  });

  test('strips currency symbols', () => {
    expect(parseMoneyInput('€ 1.234,56')).toBe(1234.56);
  });

  test('returns 0 for invalid input', () => {
    expect(parseMoneyInput('abc')).toBe(0);
    expect(parseMoneyInput('')).toBe(0);
  });
});

describe('formatMoney', () => {
  test('formats in de-AT locale', () => {
    const result = formatMoney(1234.56);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('€');
  });
});
