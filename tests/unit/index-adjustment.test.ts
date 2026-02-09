import { describe, it, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * VPI Index Adjustment (Wertsicherung) Tests
 * Threshold-based rent adjustments per MieWeG / MRG.
 */

interface IndexParams {
  baseRent: number;
  baseIndex: number;
  currentIndex: number;
  threshold: number; // e.g. 5 for 5%
  halfRule: boolean; // MieWeG Hälfteregelung
}

function calculateIndexRatio(baseIndex: number, currentIndex: number): number {
  return currentIndex / baseIndex;
}

function calculateIndexAdjustment(params: IndexParams): {
  ratio: number;
  changePercent: number;
  thresholdMet: boolean;
  adjustedRent: number;
  appliedPercent: number;
} {
  const ratio = calculateIndexRatio(params.baseIndex, params.currentIndex);
  const changePercent = roundMoney((ratio - 1) * 100);
  const thresholdMet = Math.abs(changePercent) >= params.threshold;

  let appliedPercent = 0;
  if (thresholdMet) {
    appliedPercent = params.halfRule ? roundMoney(changePercent / 2) : changePercent;
  }

  const adjustedRent = thresholdMet
    ? roundMoney(params.baseRent * (1 + appliedPercent / 100))
    : params.baseRent;

  return { ratio: roundMoney(ratio * 10000) / 10000, changePercent, thresholdMet, adjustedRent, appliedPercent };
}

describe('VPI Index Ratio', () => {
  it('no change → ratio = 1', () => {
    expect(calculateIndexRatio(100, 100)).toBe(1);
  });

  it('10% increase', () => {
    expect(calculateIndexRatio(100, 110)).toBe(1.1);
  });

  it('5% decrease', () => {
    expect(calculateIndexRatio(100, 95)).toBe(0.95);
  });
});

describe('Threshold-Based Adjustment', () => {
  it('below threshold → no adjustment', () => {
    const result = calculateIndexAdjustment({
      baseRent: 800, baseIndex: 100, currentIndex: 104, threshold: 5, halfRule: false,
    });
    expect(result.thresholdMet).toBe(false);
    expect(result.adjustedRent).toBe(800);
  });

  it('at threshold → adjustment applied', () => {
    const result = calculateIndexAdjustment({
      baseRent: 800, baseIndex: 100, currentIndex: 105, threshold: 5, halfRule: false,
    });
    expect(result.thresholdMet).toBe(true);
    expect(result.adjustedRent).toBe(840);
  });

  it('above threshold → full adjustment', () => {
    const result = calculateIndexAdjustment({
      baseRent: 1000, baseIndex: 100, currentIndex: 112, threshold: 5, halfRule: false,
    });
    expect(result.changePercent).toBe(12);
    expect(result.adjustedRent).toBe(1120);
  });
});

describe('MieWeG Hälfteregelung', () => {
  it('half-rule applies 50% of increase', () => {
    const result = calculateIndexAdjustment({
      baseRent: 800, baseIndex: 100, currentIndex: 110, threshold: 5, halfRule: true,
    });
    expect(result.appliedPercent).toBe(5); // 10% / 2
    expect(result.adjustedRent).toBe(840);
  });

  it('half-rule with fractional percent', () => {
    const result = calculateIndexAdjustment({
      baseRent: 600, baseIndex: 100, currentIndex: 107, threshold: 5, halfRule: true,
    });
    expect(result.appliedPercent).toBe(3.5); // 7% / 2
    expect(result.adjustedRent).toBe(roundMoney(600 * 1.035));
  });

  it('half-rule below threshold → no change', () => {
    const result = calculateIndexAdjustment({
      baseRent: 500, baseIndex: 100, currentIndex: 103, threshold: 5, halfRule: true,
    });
    expect(result.adjustedRent).toBe(500);
  });
});

describe('Chained Index Adjustments', () => {
  it('two successive adjustments compound correctly', () => {
    const first = calculateIndexAdjustment({
      baseRent: 800, baseIndex: 100, currentIndex: 106, threshold: 5, halfRule: false,
    });
    expect(first.adjustedRent).toBe(848);

    // Second adjustment from new base
    const second = calculateIndexAdjustment({
      baseRent: first.adjustedRent, baseIndex: 106, currentIndex: 112, threshold: 5, halfRule: false,
    });
    expect(second.changePercent).toBe(roundMoney((112 / 106 - 1) * 100));
    expect(second.adjustedRent).toBe(roundMoney(848 * (112 / 106)));
  });

  it('chained adjustments with half-rule', () => {
    const first = calculateIndexAdjustment({
      baseRent: 700, baseIndex: 100, currentIndex: 110, threshold: 5, halfRule: true,
    });
    expect(first.appliedPercent).toBe(5);
    expect(first.adjustedRent).toBe(735);

    const second = calculateIndexAdjustment({
      baseRent: first.adjustedRent, baseIndex: 110, currentIndex: 122, threshold: 5, halfRule: true,
    });
    expect(second.thresholdMet).toBe(true);
  });
});

describe('Edge Cases', () => {
  it('zero base index throws or returns Infinity', () => {
    const ratio = calculateIndexRatio(0, 100);
    expect(ratio).toBe(Infinity);
  });

  it('negative index values handled', () => {
    // Shouldn't happen but test defensiveness
    const ratio = calculateIndexRatio(100, -5);
    expect(ratio).toBe(-0.05);
  });
});
