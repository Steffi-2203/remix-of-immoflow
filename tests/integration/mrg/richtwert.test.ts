import { describe, test, expect } from 'vitest';
import { mrg } from '../../../server/mrg/mrgRules';

describe('MRG – Richtwertmietzins', () => {
  test('berechnet Richtwert korrekt', () => {
    const result = mrg.calculateRichtwert({
      flaeche: 70,
      richtwert: 6.15,
    });
    expect(result).toBeCloseTo(430.5);
  });

  test('kleine Fläche', () => {
    const result = mrg.calculateRichtwert({ flaeche: 30, richtwert: 6.15 });
    expect(result).toBeCloseTo(184.5);
  });

  test('Wiener Richtwert 2024', () => {
    const result = mrg.calculateRichtwert({ flaeche: 80, richtwert: 6.67 });
    expect(result).toBeCloseTo(533.6);
  });
});
