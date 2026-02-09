import { describe, test, expect } from 'vitest';
import { mrg } from '../../../server/mrg/mrgRules';

describe('MRG – Rundung', () => {
  test('rundet korrekt auf 2 Stellen', () => {
    expect(mrg.round(123.456)).toBe(123.46);
  });

  test('rundet korrekt ab', () => {
    expect(mrg.round(123.451)).toBe(123.45);
  });

  test('rundet korrekt kaufmännisch', () => {
    expect(mrg.round(10.005)).toBe(10.01);
  });

  test('negative Werte', () => {
    expect(mrg.round(-99.999)).toBe(-100);
  });

  test('ganzzahlige Eingabe bleibt unverändert', () => {
    expect(mrg.round(500)).toBe(500);
  });
});
