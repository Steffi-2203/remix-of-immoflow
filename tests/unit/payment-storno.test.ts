import { describe, it, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Payment Storno / Reversal Tests
 * Validates credit notes, reversals, and ledger balance impacts.
 */

interface LedgerEntry {
  type: 'charge' | 'payment' | 'storno' | 'credit' | 'interest' | 'fee';
  amount: number;
  refId?: string;
}

function computeSaldo(entries: LedgerEntry[]): number {
  return roundMoney(
    entries.reduce((s, e) => {
      if (e.type === 'charge' || e.type === 'interest' || e.type === 'fee') return s + e.amount;
      if (e.type === 'payment' || e.type === 'credit') return s - e.amount;
      if (e.type === 'storno') return s + e.amount; // reversal re-opens debt
      return s;
    }, 0)
  );
}

function reversePayment(entries: LedgerEntry[], paymentRefId: string): LedgerEntry[] {
  const payment = entries.find(e => e.refId === paymentRefId && e.type === 'payment');
  if (!payment) throw new Error('Payment not found');
  return [
    ...entries,
    { type: 'storno', amount: payment.amount, refId: `storno-${paymentRefId}` },
  ];
}

describe('Payment Storno / Reversals', () => {
  it('storno restores original saldo', () => {
    const entries: LedgerEntry[] = [
      { type: 'charge', amount: 925 },
      { type: 'payment', amount: 925, refId: 'p1' },
    ];
    expect(computeSaldo(entries)).toBe(0);

    const reversed = reversePayment(entries, 'p1');
    expect(computeSaldo(reversed)).toBe(925);
  });

  it('partial payment storno', () => {
    const entries: LedgerEntry[] = [
      { type: 'charge', amount: 1000 },
      { type: 'payment', amount: 400, refId: 'p1' },
    ];
    expect(computeSaldo(entries)).toBe(600);

    const reversed = reversePayment(entries, 'p1');
    expect(computeSaldo(reversed)).toBe(1000);
  });

  it('credit note reduces saldo', () => {
    const entries: LedgerEntry[] = [
      { type: 'charge', amount: 500 },
      { type: 'credit', amount: 100 },
    ];
    expect(computeSaldo(entries)).toBe(400);
  });

  it('storno of non-existent payment throws', () => {
    const entries: LedgerEntry[] = [{ type: 'charge', amount: 500 }];
    expect(() => reversePayment(entries, 'nonexistent')).toThrow('Payment not found');
  });

  it('double storno creates double debt', () => {
    let entries: LedgerEntry[] = [
      { type: 'charge', amount: 500 },
      { type: 'payment', amount: 500, refId: 'p1' },
    ];
    entries = reversePayment(entries, 'p1');
    // Second storno of same payment (should be prevented in production)
    entries.push({ type: 'storno', amount: 500, refId: 'storno2-p1' });
    expect(computeSaldo(entries)).toBe(1000); // charge 500 - pay 500 + storno 500 + storno 500 = 1000
  });

  it('interest adds to saldo', () => {
    const entries: LedgerEntry[] = [
      { type: 'charge', amount: 1000 },
      { type: 'interest', amount: 10.96 },
    ];
    expect(computeSaldo(entries)).toBe(1010.96);
  });

  it('dunning fee adds to saldo', () => {
    const entries: LedgerEntry[] = [
      { type: 'charge', amount: 1000 },
      { type: 'fee', amount: 5 },
    ];
    expect(computeSaldo(entries)).toBe(1005);
  });

  it('full lifecycle: charge → pay → storno → repay', () => {
    let entries: LedgerEntry[] = [
      { type: 'charge', amount: 800 },
      { type: 'payment', amount: 800, refId: 'p1' },
    ];
    expect(computeSaldo(entries)).toBe(0);

    entries = reversePayment(entries, 'p1');
    expect(computeSaldo(entries)).toBe(800);

    entries.push({ type: 'payment', amount: 800, refId: 'p2' });
    expect(computeSaldo(entries)).toBe(0);
  });

  it('saldo with mixed entries', () => {
    const entries: LedgerEntry[] = [
      { type: 'charge', amount: 925 },
      { type: 'payment', amount: 500, refId: 'p1' },
      { type: 'interest', amount: 4.66 },
      { type: 'fee', amount: 5 },
      { type: 'payment', amount: 434.66, refId: 'p2' },
    ];
    expect(computeSaldo(entries)).toBe(0);
  });

  it('negative saldo means overpayment (credit balance)', () => {
    const entries: LedgerEntry[] = [
      { type: 'charge', amount: 500 },
      { type: 'payment', amount: 700, refId: 'p1' },
    ];
    expect(computeSaldo(entries)).toBe(-200);
  });

  it('storno then credit note combination', () => {
    let entries: LedgerEntry[] = [
      { type: 'charge', amount: 1000 },
      { type: 'payment', amount: 1000, refId: 'p1' },
    ];
    entries = reversePayment(entries, 'p1');
    entries.push({ type: 'credit', amount: 200 });
    expect(computeSaldo(entries)).toBe(800);
  });

  it('preserves cent precision across many entries', () => {
    const entries: LedgerEntry[] = [];
    for (let i = 0; i < 100; i++) {
      entries.push({ type: 'charge', amount: 33.33 });
    }
    entries.push({ type: 'payment', amount: 3333, refId: 'bulk' });
    // 100 * 33.33 = 3333, payment = 3333, saldo = 0 (or -0)
    expect(Math.abs(computeSaldo(entries))).toBe(0);
  });

  it('storno amount matches original payment', () => {
    const entries: LedgerEntry[] = [
      { type: 'charge', amount: 925.50 },
      { type: 'payment', amount: 925.50, refId: 'p1' },
    ];
    const reversed = reversePayment(entries, 'p1');
    const stornoEntry = reversed.find(e => e.type === 'storno');
    expect(stornoEntry?.amount).toBe(925.50);
  });
});
