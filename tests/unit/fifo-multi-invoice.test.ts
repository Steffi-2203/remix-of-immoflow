import { describe, it, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * FIFO Multi-Invoice Allocation Tests
 * Validates chronological payment allocation across multiple open invoices.
 */

interface SimpleInvoice {
  id: string;
  year: number;
  month: number;
  gesamtbetrag: number;
  paidAmount: number;
}

function fifoAllocate(invoices: SimpleInvoice[], payment: number) {
  let remaining = roundMoney(payment);
  const allocations: { invoiceId: string; applied: number; newPaid: number; newStatus: string }[] = [];

  // Sort chronologically (FIFO)
  const sorted = [...invoices].sort((a, b) => a.year - b.year || a.month - b.month);

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
      newPaid,
      newStatus: newPaid >= inv.gesamtbetrag ? 'bezahlt' : newPaid > 0 ? 'teilbezahlt' : 'offen',
    });
  }

  return { allocations, unapplied: remaining };
}

describe('FIFO Multi-Invoice Allocation', () => {
  it('allocates to oldest invoice first', () => {
    const invoices: SimpleInvoice[] = [
      { id: 'jan', year: 2026, month: 1, gesamtbetrag: 500, paidAmount: 0 },
      { id: 'feb', year: 2026, month: 2, gesamtbetrag: 500, paidAmount: 0 },
    ];
    const { allocations } = fifoAllocate(invoices, 500);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].invoiceId).toBe('jan');
    expect(allocations[0].newStatus).toBe('bezahlt');
  });

  it('spills over to second invoice', () => {
    const invoices: SimpleInvoice[] = [
      { id: 'jan', year: 2026, month: 1, gesamtbetrag: 300, paidAmount: 0 },
      { id: 'feb', year: 2026, month: 2, gesamtbetrag: 500, paidAmount: 0 },
    ];
    const { allocations } = fifoAllocate(invoices, 600);
    expect(allocations[0]).toEqual({ invoiceId: 'jan', applied: 300, newPaid: 300, newStatus: 'bezahlt' });
    expect(allocations[1]).toEqual({ invoiceId: 'feb', applied: 300, newPaid: 300, newStatus: 'teilbezahlt' });
  });

  it('handles cross-year invoices in correct order', () => {
    const invoices: SimpleInvoice[] = [
      { id: 'dec25', year: 2025, month: 12, gesamtbetrag: 400, paidAmount: 0 },
      { id: 'jan26', year: 2026, month: 1, gesamtbetrag: 400, paidAmount: 0 },
    ];
    const { allocations } = fifoAllocate(invoices, 500);
    expect(allocations[0].invoiceId).toBe('dec25');
    expect(allocations[0].newStatus).toBe('bezahlt');
    expect(allocations[1].invoiceId).toBe('jan26');
    expect(allocations[1].applied).toBe(100);
  });

  it('skips already paid invoices', () => {
    const invoices: SimpleInvoice[] = [
      { id: 'jan', year: 2026, month: 1, gesamtbetrag: 500, paidAmount: 500 },
      { id: 'feb', year: 2026, month: 2, gesamtbetrag: 500, paidAmount: 0 },
    ];
    const { allocations } = fifoAllocate(invoices, 300);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].invoiceId).toBe('feb');
  });

  it('resumes partially paid invoice', () => {
    const invoices: SimpleInvoice[] = [
      { id: 'jan', year: 2026, month: 1, gesamtbetrag: 800, paidAmount: 300 },
    ];
    const { allocations } = fifoAllocate(invoices, 500);
    expect(allocations[0].applied).toBe(500);
    expect(allocations[0].newPaid).toBe(800);
    expect(allocations[0].newStatus).toBe('bezahlt');
  });

  it('returns unapplied overpayment', () => {
    const invoices: SimpleInvoice[] = [
      { id: 'jan', year: 2026, month: 1, gesamtbetrag: 200, paidAmount: 0 },
    ];
    const { allocations, unapplied } = fifoAllocate(invoices, 350);
    expect(allocations[0].applied).toBe(200);
    expect(unapplied).toBe(150);
  });

  it('allocates across 12 months', () => {
    const invoices = Array.from({ length: 12 }, (_, i) => ({
      id: `m${i + 1}`,
      year: 2026,
      month: i + 1,
      gesamtbetrag: 100,
      paidAmount: 0,
    }));
    const { allocations, unapplied } = fifoAllocate(invoices, 1200);
    expect(allocations).toHaveLength(12);
    expect(allocations.every(a => a.newStatus === 'bezahlt')).toBe(true);
    expect(unapplied).toBe(0);
  });

  it('handles zero payment gracefully', () => {
    const invoices: SimpleInvoice[] = [
      { id: 'jan', year: 2026, month: 1, gesamtbetrag: 500, paidAmount: 0 },
    ];
    const { allocations, unapplied } = fifoAllocate(invoices, 0);
    expect(allocations).toHaveLength(0);
    expect(unapplied).toBe(0);
  });

  it('handles fractional amounts without cent drift', () => {
    const invoices: SimpleInvoice[] = [
      { id: 'a', year: 2026, month: 1, gesamtbetrag: 333.33, paidAmount: 0 },
      { id: 'b', year: 2026, month: 2, gesamtbetrag: 333.33, paidAmount: 0 },
      { id: 'c', year: 2026, month: 3, gesamtbetrag: 333.34, paidAmount: 0 },
    ];
    const { allocations, unapplied } = fifoAllocate(invoices, 1000);
    const totalApplied = allocations.reduce((s, a) => roundMoney(s + a.applied), 0);
    expect(totalApplied).toBe(1000);
    expect(unapplied).toBe(0);
  });

  it('empty invoice list returns full unapplied', () => {
    const { allocations, unapplied } = fifoAllocate([], 500);
    expect(allocations).toHaveLength(0);
    expect(unapplied).toBe(500);
  });
});
