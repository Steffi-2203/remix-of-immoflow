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

  // ── DB trigger parity tests ──
  // The DB trigger uses: regexp_replace(lower(trim(description)), '\s+', ' ', 'g')
  // Our TS function must produce identical output for all inputs.

  describe('DB trigger parity', () => {
    /**
     * Simulate the Postgres trigger logic in JS:
     *   regexp_replace(lower(trim(description)), '\s+', ' ', 'g')
     *
     * Our normalizeDescription additionally does:
     *   - NFC unicode normalization (safe superset)
     *   - Invisible character stripping (safe superset)
     *
     * For all standard inputs the results must be identical.
     */
    function pgTriggerNormalize(raw: string): string {
      return raw.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    const PARITY_CASES = [
      'Grundmiete',
      '  Betriebskosten  ',
      'Heizkosten\tAbrechnung\n2025',
      'VERSICHERUNG Gebäude',
      'müllabfuhr 1. OG',
      'Lift / Aufzug Wartung',
      '   Multiple   Spaces   Here   ',
      'Straße 123',
      'Wasser/Abwasser',
      'BK-Nachzahlung 2024',
    ];

    for (const input of PARITY_CASES) {
      test(`parity: "${input.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`, () => {
        const tsResult = normalizeDescription(input);
        const pgResult = pgTriggerNormalize(input);
        expect(tsResult).toBe(pgResult);
      });
    }

    test('parity holds for empty-ish strings', () => {
      expect(normalizeDescription('')).toBe(pgTriggerNormalize(''));
      expect(normalizeDescription('   ')).toBe(pgTriggerNormalize('   '));
    });
  });
});
