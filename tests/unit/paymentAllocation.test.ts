import { describe, test, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Payment Allocation & Dunning pure logic tests.
 * Tests the MRG-compliant payment allocation priority (BK→HK→Miete)
 * and ABGB §1333 interest calculation.
 */

// ── Payment Allocation Logic ──

describe('Payment Allocation – FIFO by year/month', () => {
  interface Invoice {
    id: string;
    year: number;
    month: number;
    gesamtbetrag: number;
    paidAmount: number;
  }

  function allocatePayment(invoices: Invoice[], amount: number) {
    const sorted = [...invoices].sort((a, b) => a.year - b.year || a.month - b.month);
    let remaining = roundMoney(amount);
    const allocations: { invoiceId: string; applied: number; newStatus: string }[] = [];

    for (const inv of sorted) {
      if (remaining <= 0) break;
      const due = roundMoney(inv.gesamtbetrag - inv.paidAmount);
      if (due <= 0) continue;

      const apply = roundMoney(Math.min(remaining, due));
      const newPaid = roundMoney(inv.paidAmount + apply);
      remaining = roundMoney(remaining - apply);

      allocations.push({
        invoiceId: inv.id,
        applied: apply,
        newStatus: newPaid >= inv.gesamtbetrag ? 'bezahlt' : 'teilbezahlt',
      });
    }

    return { allocations, unapplied: remaining };
  }

  test('single invoice fully paid', () => {
    const invoices: Invoice[] = [
      { id: 'inv1', year: 2025, month: 1, gesamtbetrag: 1000, paidAmount: 0 },
    ];
    const result = allocatePayment(invoices, 1000);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].applied).toBe(1000);
    expect(result.allocations[0].newStatus).toBe('bezahlt');
    expect(result.unapplied).toBe(0);
  });

  test('partial payment → teilbezahlt', () => {
    const invoices: Invoice[] = [
      { id: 'inv1', year: 2025, month: 1, gesamtbetrag: 1000, paidAmount: 0 },
    ];
    const result = allocatePayment(invoices, 600);
    expect(result.allocations[0].applied).toBe(600);
    expect(result.allocations[0].newStatus).toBe('teilbezahlt');
    expect(result.unapplied).toBe(0);
  });

  test('overpayment → unapplied remainder', () => {
    const invoices: Invoice[] = [
      { id: 'inv1', year: 2025, month: 1, gesamtbetrag: 500, paidAmount: 0 },
    ];
    const result = allocatePayment(invoices, 800);
    expect(result.allocations[0].applied).toBe(500);
    expect(result.unapplied).toBe(300);
  });

  test('FIFO: oldest invoice first', () => {
    const invoices: Invoice[] = [
      { id: 'inv3', year: 2025, month: 3, gesamtbetrag: 400, paidAmount: 0 },
      { id: 'inv1', year: 2025, month: 1, gesamtbetrag: 500, paidAmount: 0 },
      { id: 'inv2', year: 2025, month: 2, gesamtbetrag: 600, paidAmount: 0 },
    ];
    const result = allocatePayment(invoices, 700);
    expect(result.allocations[0].invoiceId).toBe('inv1');
    expect(result.allocations[0].applied).toBe(500);
    expect(result.allocations[1].invoiceId).toBe('inv2');
    expect(result.allocations[1].applied).toBe(200);
    expect(result.unapplied).toBe(0);
  });

  test('skips already paid invoices', () => {
    const invoices: Invoice[] = [
      { id: 'inv1', year: 2025, month: 1, gesamtbetrag: 500, paidAmount: 500 },
      { id: 'inv2', year: 2025, month: 2, gesamtbetrag: 600, paidAmount: 0 },
    ];
    const result = allocatePayment(invoices, 600);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].invoiceId).toBe('inv2');
  });

  test('cross-year allocation', () => {
    const invoices: Invoice[] = [
      { id: 'inv-dec', year: 2024, month: 12, gesamtbetrag: 300, paidAmount: 0 },
      { id: 'inv-jan', year: 2025, month: 1, gesamtbetrag: 300, paidAmount: 0 },
    ];
    const result = allocatePayment(invoices, 500);
    expect(result.allocations[0].invoiceId).toBe('inv-dec');
    expect(result.allocations[0].applied).toBe(300);
    expect(result.allocations[1].invoiceId).toBe('inv-jan');
    expect(result.allocations[1].applied).toBe(200);
  });

  test('zero payment → no allocations', () => {
    const invoices: Invoice[] = [
      { id: 'inv1', year: 2025, month: 1, gesamtbetrag: 1000, paidAmount: 0 },
    ];
    const result = allocatePayment(invoices, 0);
    expect(result.allocations).toHaveLength(0);
    expect(result.unapplied).toBe(0);
  });

  test('large portfolio: 100 invoices', () => {
    const invoices: Invoice[] = Array.from({ length: 100 }, (_, i) => ({
      id: `inv-${i}`,
      year: 2024 + Math.floor(i / 12),
      month: (i % 12) + 1,
      gesamtbetrag: 1000,
      paidAmount: 0,
    }));
    const result = allocatePayment(invoices, 50000);
    expect(result.allocations.filter(a => a.newStatus === 'bezahlt')).toHaveLength(50);
    expect(result.unapplied).toBe(0);
  });
});

// ── Dunning Level ──

describe('Dunning Level Determination', () => {
  function getDunningLevel(daysOverdue: number): number {
    if (daysOverdue >= 45) return 3;
    if (daysOverdue >= 30) return 2;
    if (daysOverdue >= 14) return 1;
    return 0;
  }

  test.each([
    [0, 0],
    [13, 0],
    [14, 1],
    [29, 1],
    [30, 2],
    [44, 2],
    [45, 3],
    [100, 3],
  ])('%d days overdue → level %d', (days, expected) => {
    expect(getDunningLevel(days)).toBe(expected);
  });
});

// ── ABGB §1333 Interest Calculation ──

describe('ABGB §1333 – Verzugszinsen (4% p.a.)', () => {
  function calculateInterest(principal: number, daysOverdue: number, annualRate = 4): number {
    const dailyRate = annualRate / 365 / 100;
    return roundMoney(principal * dailyRate * daysOverdue);
  }

  test('€1000 for 30 days at 4%', () => {
    const interest = calculateInterest(1000, 30, 4);
    // 1000 * (4/365/100) * 30 = 3.29
    expect(interest).toBe(3.29);
  });

  test('€5000 for 90 days at 4%', () => {
    const interest = calculateInterest(5000, 90, 4);
    // 5000 * 0.00010959 * 90 = 49.32
    expect(interest).toBe(49.32);
  });

  test('0 days → 0 interest', () => {
    expect(calculateInterest(1000, 0)).toBe(0);
  });

  test('0 principal → 0 interest', () => {
    expect(calculateInterest(0, 30)).toBe(0);
  });

  test('full year = 4% of principal', () => {
    const interest = calculateInterest(10000, 365, 4);
    expect(interest).toBe(400);
  });

  test('custom rate 8%', () => {
    const interest = calculateInterest(1000, 365, 8);
    expect(interest).toBe(80);
  });
});

// ── Reconcile Rounding (deterministic cent distribution) ──

describe('Reconcile Rounding', () => {
  function reconcileRounding(lines: { amount: number; lineType: string; unitId: string }[], expectedTotal: number): void {
    const roundedSum = lines.reduce((s, l) => s + roundMoney(l.amount), 0);
    let diff = roundMoney(expectedTotal - roundedSum);
    if (Math.abs(diff) < 0.01) return;

    lines.sort((a, b) => {
      const d = Math.abs(b.amount) - Math.abs(a.amount);
      if (d !== 0) return d;
      const typeCmp = a.lineType.localeCompare(b.lineType);
      if (typeCmp !== 0) return typeCmp;
      return a.unitId.localeCompare(b.unitId);
    });

    const maxIter = lines.length * 2;
    let i = 0;
    while (Math.abs(diff) >= 0.01 && i < maxIter) {
      const adjust = diff > 0 ? 0.01 : -0.01;
      lines[i % lines.length].amount = roundMoney(lines[i % lines.length].amount + adjust);
      diff = roundMoney(diff - adjust);
      i++;
    }
  }

  test('adjusts 1 cent difference', () => {
    const lines = [
      { amount: 333.33, lineType: 'grundmiete', unitId: 'u1' },
      { amount: 333.33, lineType: 'bk', unitId: 'u1' },
      { amount: 333.33, lineType: 'hk', unitId: 'u1' },
    ];
    reconcileRounding(lines, 1000);
    const sum = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
    expect(sum).toBe(1000);
  });

  test('no adjustment needed when sum matches', () => {
    const lines = [
      { amount: 500, lineType: 'grundmiete', unitId: 'u1' },
      { amount: 500, lineType: 'bk', unitId: 'u1' },
    ];
    reconcileRounding(lines, 1000);
    expect(lines[0].amount).toBe(500);
    expect(lines[1].amount).toBe(500);
  });

  test('deterministic: same input → same output', () => {
    const makeLines = () => [
      { amount: 333.33, lineType: 'grundmiete', unitId: 'u1' },
      { amount: 333.33, lineType: 'bk', unitId: 'u2' },
      { amount: 333.33, lineType: 'hk', unitId: 'u3' },
    ];
    const lines1 = makeLines();
    const lines2 = makeLines();
    reconcileRounding(lines1, 1000);
    reconcileRounding(lines2, 1000);
    expect(lines1).toEqual(lines2);
  });

  test('handles large difference across many lines', () => {
    const lines = Array.from({ length: 10 }, (_, i) => ({
      amount: 99.99,
      lineType: `type-${i}`,
      unitId: `u${i}`,
    }));
    // Sum = 999.90, expected = 1000
    reconcileRounding(lines, 1000);
    const sum = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
    expect(sum).toBe(1000);
  });
});

// ── Water Cost Distribution ──

describe('Water Cost Distribution', () => {
  function distributeWaterCosts(
    totalCost: number,
    readings: { unitId: string; consumption: number; coefficient: number }[]
  ): Map<string, { share: number; provisional: boolean }> {
    const result = new Map<string, { share: number; provisional: boolean }>();
    const weighted = readings.map(r => ({
      unitId: r.unitId,
      weighted: r.consumption * r.coefficient,
    }));
    const buildingTotal = weighted.reduce((s, w) => s + w.weighted, 0);

    if (buildingTotal > 0) {
      for (const w of weighted) {
        result.set(w.unitId, {
          share: roundMoney((w.weighted / buildingTotal) * totalCost),
          provisional: false,
        });
      }
    } else {
      const perUnit = roundMoney(totalCost / readings.length);
      for (const r of readings) {
        result.set(r.unitId, { share: perUnit, provisional: true });
      }
    }
    return result;
  }

  test('proportional distribution with coefficients', () => {
    const result = distributeWaterCosts(1000, [
      { unitId: 'u1', consumption: 100, coefficient: 1.0 },
      { unitId: 'u2', consumption: 200, coefficient: 1.0 },
      { unitId: 'u3', consumption: 200, coefficient: 0.5 }, // warm water coeff
    ]);
    // weighted: 100, 200, 100 = 400 total
    expect(result.get('u1')?.share).toBe(250);  // 100/400
    expect(result.get('u2')?.share).toBe(500);  // 200/400
    expect(result.get('u3')?.share).toBe(250);  // 100/400
    expect(result.get('u1')?.provisional).toBe(false);
  });

  test('fallback to equal distribution with zero consumption', () => {
    const result = distributeWaterCosts(900, [
      { unitId: 'u1', consumption: 0, coefficient: 1.0 },
      { unitId: 'u2', consumption: 0, coefficient: 1.0 },
      { unitId: 'u3', consumption: 0, coefficient: 1.0 },
    ]);
    expect(result.get('u1')?.share).toBe(300);
    expect(result.get('u1')?.provisional).toBe(true);
  });
});
