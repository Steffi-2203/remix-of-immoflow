import { describe, test, expect } from 'vitest';
import { normalizeDescription } from '../../server/lib/normalizeDescription';

describe('normalizeDescription', () => {
  test('trims and collapses whitespace and lowercases', () => {
    const a = '  Heizkosten  Abrechnung \n 2025 ';
    const b = 'heizkosten abrechnung 2025';
    expect(normalizeDescription(a)).toBe(b);
  });

  test('unicode normalization deterministic', () => {
    const a = 'Straße';
    expect(typeof normalizeDescription(a)).toBe('string');
    expect(normalizeDescription(a)).toBe(normalizeDescription(a));
  });

  test('collapses tabs and mixed whitespace', () => {
    expect(normalizeDescription(' A\tB ')).toBe('a b');
  });

  test('returns null for null/undefined', () => {
    expect(normalizeDescription(null)).toBeNull();
    expect(normalizeDescription(undefined)).toBeNull();
  });

  test('strips invisible characters', () => {
    expect(normalizeDescription('a\u200Bb')).toBe('ab');
  });
});
