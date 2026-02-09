import { describe, test, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * MRG Mietzins – Rent calculation and VPI index adjustment tests.
 */

interface IndexParams {
  baseRent: number;
  baseIndex: number;
  currentIndex: number;
  threshold: number;
  halfRule: boolean;
}

function calculateIndexAdjustment(params: IndexParams) {
  const ratio = params.currentIndex / params.baseIndex;
  const changePercent = roundMoney((ratio - 1) * 100);
  const thresholdMet = Math.abs(changePercent) >= params.threshold;

  let appliedPercent = 0;
  if (thresholdMet) {
    appliedPercent = params.halfRule ? roundMoney(changePercent / 2) : changePercent;
  }

  const adjustedRent = thresholdMet
    ? roundMoney(params.baseRent * (1 + appliedPercent / 100))
    : params.baseRent;

  return { changePercent, thresholdMet, adjustedRent, appliedPercent };
}

describe('MRG Mietzins – VPI Wertsicherung', () => {
  test('5% threshold not met → rent unchanged', () => {
    const result = calculateIndexAdjustment({
      baseRent: 800, baseIndex: 100, currentIndex: 104, threshold: 5, halfRule: false,
    });
    expect(result.thresholdMet).toBe(false);
    expect(result.adjustedRent).toBe(800);
  });

  test('5% threshold met → rent adjusted', () => {
    const result = calculateIndexAdjustment({
      baseRent: 800, baseIndex: 100, currentIndex: 106, threshold: 5, halfRule: false,
    });
    expect(result.thresholdMet).toBe(true);
    expect(result.adjustedRent).toBe(roundMoney(800 * 1.06));
  });

  test('Hälfteregelung: only half of change applied', () => {
    const result = calculateIndexAdjustment({
      baseRent: 1000, baseIndex: 100, currentIndex: 110, threshold: 5, halfRule: true,
    });
    expect(result.thresholdMet).toBe(true);
    expect(result.appliedPercent).toBe(5); // 10% / 2
    expect(result.adjustedRent).toBe(1050);
  });

  test('negative index change → rent decrease', () => {
    const result = calculateIndexAdjustment({
      baseRent: 900, baseIndex: 110, currentIndex: 100, threshold: 5, halfRule: false,
    });
    expect(result.thresholdMet).toBe(true);
    expect(result.adjustedRent).toBeLessThan(900);
  });
});

describe('MRG Mietzins – Grundmiete Composition', () => {
  test('Gesamtmiete = Grundmiete + BK + HK + USt', () => {
    const grundmiete = 650;
    const bk = 180;
    const hk = 95;
    const ustMiete = roundMoney(grundmiete * 0.10);
    const ustBk = roundMoney(bk * 0.10);
    const ustHk = roundMoney(hk * 0.20);
    const gesamt = roundMoney(grundmiete + bk + hk + ustMiete + ustBk + ustHk);

    expect(gesamt).toBe(roundMoney(650 + 180 + 95 + 65 + 18 + 19));
    expect(gesamt).toBe(1027);
  });
});
