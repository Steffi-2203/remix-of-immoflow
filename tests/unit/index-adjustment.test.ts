import { describe, it, expect } from 'vitest';
import { roundMoney } from '../../shared/utils';

const SCHWELLENWERT = 0.05;

function calculateVpiIncrease(currentVpi: number, baseVpi: number): number {
  if (baseVpi <= 0) return 0;
  return (currentVpi - baseVpi) / baseVpi;
}

function shouldTriggerAdjustment(percentageIncrease: number, schwellenwert: number = SCHWELLENWERT): boolean {
  return percentageIncrease >= schwellenwert;
}

function applyVpiAdjustment(currentRent: number, percentageIncrease: number): number {
  if (percentageIncrease < 0) return currentRent;
  return roundMoney(currentRent * (1 + percentageIncrease));
}

function calculateChainedAdjustment(adjustments: Array<{ baseVpi: number; newVpi: number }>): number {
  let factor = 1;
  for (const adj of adjustments) {
    const increase = (adj.newVpi - adj.baseVpi) / adj.baseVpi;
    if (increase > 0) {
      factor *= (1 + increase);
    }
  }
  return roundMoney(factor * 100) / 100;
}

function calculateRichtwertAdjustment(currentRent: number, oldRichtwert: number, newRichtwert: number): number {
  if (oldRichtwert <= 0) return currentRent;
  return roundMoney(currentRent * (newRichtwert / oldRichtwert));
}

describe('VPI (Index) Rent Adjustment', () => {
  it('5% increase triggers adjustment', () => {
    const increase = calculateVpiIncrease(105, 100);
    expect(shouldTriggerAdjustment(increase)).toBe(true);
  });

  it('4.9% increase does NOT trigger', () => {
    const increase = calculateVpiIncrease(104.9, 100);
    expect(shouldTriggerAdjustment(increase)).toBe(false);
  });

  it('exactly 5% triggers', () => {
    const increase = calculateVpiIncrease(105, 100);
    expect(increase).toBeCloseTo(0.05);
    expect(shouldTriggerAdjustment(increase)).toBe(true);
  });

  it('new rent calculated correctly with 5% increase', () => {
    const newRent = applyVpiAdjustment(1000, 0.05);
    expect(newRent).toBe(1050);
  });

  it('new rent calculated with 10% increase', () => {
    const newRent = applyVpiAdjustment(1000, 0.10);
    expect(newRent).toBe(1100);
  });

  it('chained adjustments: base 100 -> 105 -> 110.25', () => {
    const factor = calculateChainedAdjustment([
      { baseVpi: 100, newVpi: 105 },
      { baseVpi: 105, newVpi: 110.25 },
    ]);
    const newRent = roundMoney(1000 * factor);
    expect(newRent).toBe(1102.5);
  });

  it('chained adjustments: 3 steps', () => {
    const factor = calculateChainedAdjustment([
      { baseVpi: 100, newVpi: 105 },
      { baseVpi: 105, newVpi: 110 },
      { baseVpi: 110, newVpi: 115 },
    ]);
    const newRent = roundMoney(1000 * factor);
    const expected = roundMoney(1000 * (105 / 100) * (110 / 105) * (115 / 110));
    expect(newRent).toBe(expected);
  });

  it('Richtwert adjustment proportional', () => {
    const newRent = calculateRichtwertAdjustment(800, 5.81, 6.39);
    expect(newRent).toBe(roundMoney(800 * (6.39 / 5.81)));
  });

  it('zero percentage increase = no change', () => {
    const newRent = applyVpiAdjustment(1000, 0);
    expect(newRent).toBe(1000);
  });

  it('negative VPI (deflation) - should not reduce rent (MRG protection)', () => {
    const newRent = applyVpiAdjustment(1000, -0.03);
    expect(newRent).toBe(1000);
  });

  it('very small base VPI (edge case)', () => {
    const increase = calculateVpiIncrease(1.05, 1.0);
    expect(increase).toBeCloseTo(0.05);
    expect(shouldTriggerAdjustment(increase)).toBe(true);
  });

  it('large increase (20%) calculates correctly', () => {
    const increase = calculateVpiIncrease(120, 100);
    expect(increase).toBe(0.2);
    const newRent = applyVpiAdjustment(1000, increase);
    expect(newRent).toBe(1200);
  });
});
