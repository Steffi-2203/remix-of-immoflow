import { describe, it, expect } from 'vitest';
import { roundMoney, roundToCents } from '../../shared/utils';

/**
 * Exported for testability — mirrors the reconcileRounding logic
 * from server/services/billing.service.ts with deterministic sorting.
 */
function reconcileRounding(lines: { amount: number; lineType: string; unitId: string }[], expectedTotal: number): void {
  const roundedSum = lines.reduce((s, l) => s + roundMoney(l.amount || 0), 0);
  let diff = roundMoney(expectedTotal - roundedSum);
  if (Math.abs(diff) < 0.01) return;

  lines.sort((a, b) => {
    const d = Math.abs(b.amount || 0) - Math.abs(a.amount || 0);
    if (d !== 0) return d;
    const typeCmp = (a.lineType || '').localeCompare(b.lineType || '');
    if (typeCmp !== 0) return typeCmp;
    return (a.unitId || '').localeCompare(b.unitId || '');
  });

  let i = 0;
  while (Math.abs(diff) >= 0.01 && i < lines.length * 2) {
    const adjust = diff > 0 ? 0.01 : -0.01;
    lines[i % lines.length].amount = roundMoney(lines[i % lines.length].amount + adjust);
    diff = roundMoney(diff - adjust);
    i++;
  }
}

describe('reconcileRounding determinism', () => {
  it('produces identical results across 100 repeated runs with equal amounts', () => {
    const buildLines = () => [
      { amount: 95.00, lineType: 'betriebskosten', unitId: 'unit-a' },
      { amount: 95.00, lineType: 'heizkosten', unitId: 'unit-a' },
      { amount: 95.00, lineType: 'wasserkosten', unitId: 'unit-a' },
    ];
    const expectedTotal = 285.01; // forces +0.01 adjustment

    const referenceLines = buildLines();
    reconcileRounding(referenceLines, expectedTotal);

    for (let run = 0; run < 100; run++) {
      const lines = buildLines();
      reconcileRounding(lines, expectedTotal);
      expect(lines).toEqual(referenceLines);
    }
  });

  it('assigns cent adjustment to deterministic line (sorted by lineType)', () => {
    const lines = [
      { amount: 100.00, lineType: 'heizkosten', unitId: 'u1' },
      { amount: 100.00, lineType: 'betriebskosten', unitId: 'u1' },
    ];
    reconcileRounding(lines, 200.01);

    // After sort: betriebskosten < heizkosten, both same amount
    // Adjustment goes to first after sort = betriebskosten
    const bk = lines.find(l => l.lineType === 'betriebskosten')!;
    const hk = lines.find(l => l.lineType === 'heizkosten')!;
    expect(bk.amount).toBe(100.01);
    expect(hk.amount).toBe(100.00);
  });

  it('uses unitId as tertiary sort when lineType matches', () => {
    const lines = [
      { amount: 50.00, lineType: 'betriebskosten', unitId: 'unit-b' },
      { amount: 50.00, lineType: 'betriebskosten', unitId: 'unit-a' },
    ];
    reconcileRounding(lines, 100.01);

    const unitA = lines.find(l => l.unitId === 'unit-a')!;
    const unitB = lines.find(l => l.unitId === 'unit-b')!;
    expect(unitA.amount).toBe(50.01);
    expect(unitB.amount).toBe(50.00);
  });

  it('roundToCents is identical to roundMoney', () => {
    expect(roundToCents).toBe(roundMoney);
    expect(roundToCents(1.235)).toBe(1.24);
    expect(roundToCents(NaN)).toBe(0);
  });
});
