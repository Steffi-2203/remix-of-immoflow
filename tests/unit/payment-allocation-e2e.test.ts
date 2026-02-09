import { describe, test, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Payment Allocation E2E Logic Tests
 * 
 * Tests the FIFO allocation algorithm and ledger entry creation
 * logic as pure functions, without DB or HTTP dependencies.
 * 
 * For full API-level E2E tests, use the billing-parity CI job
 * which runs against a real Postgres instance.
 */

interface Invoice {
  id: string;
  tenantId: string;
  month: number;
  year: number;
  gesamtbetrag: number;
  paidAmount: number;
  status: 'offen' | 'teilbezahlt' | 'bezahlt' | 'ueberfaellig';
  faelligAm: string;
}

interface AllocationResult {
  invoiceId: string;
  allocated: number;
  newPaidAmount: number;
  newStatus: Invoice['status'];
}

interface LedgerEntry {
  type: 'payment' | 'charge' | 'interest' | 'fee' | 'credit';
  amount: number;
  invoiceId?: string;
}

/**
 * Pure FIFO allocation: oldest invoice first
 */
function allocatePaymentFIFO(
  amount: number,
  openInvoices: Invoice[]
): { allocations: AllocationResult[]; unapplied: number } {
  const sorted = [...openInvoices].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  let remaining = roundMoney(amount);
  const allocations: AllocationResult[] = [];

  for (const inv of sorted) {
    if (remaining <= 0) break;
    const outstanding = roundMoney(inv.gesamtbetrag - inv.paidAmount);
    if (outstanding <= 0) continue;

    const allocated = roundMoney(Math.min(remaining, outstanding));
    const newPaidAmount = roundMoney(inv.paidAmount + allocated);
    const newStatus: Invoice['status'] = 
      newPaidAmount >= inv.gesamtbetrag ? 'bezahlt' : 'teilbezahlt';

    allocations.push({
      invoiceId: inv.id,
      allocated,
      newPaidAmount,
      newStatus,
    });
    remaining = roundMoney(remaining - allocated);
  }

  return { allocations, unapplied: remaining };
}

/**
 * Calculate interest per §1333 ABGB (4% p.a.)
 */
function calculateInterest(principal: number, daysOverdue: number): number {
  if (daysOverdue <= 0 || principal <= 0) return 0;
  return roundMoney(principal * (4 / 365 / 100) * daysOverdue);
}

function getDunningLevel(daysOverdue: number): number {
  if (daysOverdue >= 45) return 3;
  if (daysOverdue >= 30) return 2;
  if (daysOverdue >= 14) return 1;
  return 0;
}

const DUNNING_FEES: Record<number, number> = { 1: 0, 2: 5, 3: 10 };

// ───────────────────────────────────────
// Tests
// ───────────────────────────────────────

describe('Payment Allocation – FIFO Logic', () => {
  const invoices: Invoice[] = [
    { id: 'inv-jan', tenantId: 't1', month: 1, year: 2025, gesamtbetrag: 800, paidAmount: 0, status: 'offen', faelligAm: '2025-01-05' },
    { id: 'inv-feb', tenantId: 't1', month: 2, year: 2025, gesamtbetrag: 800, paidAmount: 0, status: 'offen', faelligAm: '2025-02-05' },
    { id: 'inv-mar', tenantId: 't1', month: 3, year: 2025, gesamtbetrag: 800, paidAmount: 0, status: 'offen', faelligAm: '2025-03-05' },
  ];

  test('exact payment covers one invoice', () => {
    const { allocations, unapplied } = allocatePaymentFIFO(800, invoices);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].invoiceId).toBe('inv-jan');
    expect(allocations[0].newStatus).toBe('bezahlt');
    expect(unapplied).toBe(0);
  });

  test('partial payment → teilbezahlt', () => {
    const { allocations, unapplied } = allocatePaymentFIFO(500, invoices);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].allocated).toBe(500);
    expect(allocations[0].newStatus).toBe('teilbezahlt');
    expect(unapplied).toBe(0);
  });

  test('overpayment → unapplied credit', () => {
    const { allocations, unapplied } = allocatePaymentFIFO(2500, invoices);
    expect(allocations).toHaveLength(3);
    expect(allocations.every(a => a.newStatus === 'bezahlt')).toBe(true);
    expect(unapplied).toBe(100);
  });

  test('payment spans multiple invoices', () => {
    const { allocations, unapplied } = allocatePaymentFIFO(1300, invoices);
    expect(allocations).toHaveLength(2);
    expect(allocations[0].invoiceId).toBe('inv-jan');
    expect(allocations[0].allocated).toBe(800);
    expect(allocations[1].invoiceId).toBe('inv-feb');
    expect(allocations[1].allocated).toBe(500);
    expect(unapplied).toBe(0);
  });

  test('pre-paid invoice is skipped', () => {
    const withPrepaid: Invoice[] = [
      { ...invoices[0], paidAmount: 800, status: 'bezahlt' },
      invoices[1],
      invoices[2],
    ];
    const { allocations } = allocatePaymentFIFO(800, withPrepaid);
    expect(allocations).toHaveLength(1);
    expect(allocations[0].invoiceId).toBe('inv-feb');
  });

  test('zero payment → no allocations', () => {
    const { allocations, unapplied } = allocatePaymentFIFO(0, invoices);
    expect(allocations).toHaveLength(0);
    expect(unapplied).toBe(0);
  });

  test('no open invoices → full unapplied', () => {
    const { allocations, unapplied } = allocatePaymentFIFO(500, []);
    expect(allocations).toHaveLength(0);
    expect(unapplied).toBe(500);
  });
});

describe('Payment Allocation – Ledger Entry Generation', () => {
  test('generates correct ledger entries for partial + interest + fee', () => {
    const today = new Date('2025-03-01');
    const invoice: Invoice = {
      id: 'inv-jan', tenantId: 't1', month: 1, year: 2025,
      gesamtbetrag: 800, paidAmount: 0, status: 'ueberfaellig',
      faelligAm: '2025-01-05',
    };

    // 55 days overdue → level 3 → €10 fee
    const dueDate = new Date(invoice.faelligAm);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const { allocations, unapplied } = allocatePaymentFIFO(500, [invoice]);
    const entries: LedgerEntry[] = [];

    // Payment entry
    entries.push({ type: 'payment', amount: 500 });

    // Charge entry
    entries.push({ type: 'charge', amount: invoice.gesamtbetrag, invoiceId: invoice.id });

    // Interest on outstanding (800 - 0 = 800, 55 days)
    const outstanding = roundMoney(invoice.gesamtbetrag - invoice.paidAmount);
    const interest = calculateInterest(outstanding, daysOverdue);
    if (interest > 0) {
      entries.push({ type: 'interest', amount: interest, invoiceId: invoice.id });
    }

    // Dunning fee
    const level = getDunningLevel(daysOverdue);
    const fee = DUNNING_FEES[level] ?? 0;
    if (fee > 0) {
      entries.push({ type: 'fee', amount: fee, invoiceId: invoice.id });
    }

    // Credit (none expected)
    if (unapplied > 0) {
      entries.push({ type: 'credit', amount: unapplied });
    }

    // Assertions
    expect(entries.find(e => e.type === 'payment')!.amount).toBe(500);
    expect(interest).toBeGreaterThan(0);
    expect(interest).toBe(roundMoney(800 * (4 / 365 / 100) * daysOverdue));
    expect(level).toBe(3); // 55 days > 45
    expect(fee).toBe(10);
    expect(entries.find(e => e.type === 'credit')).toBeUndefined();
    expect(allocations[0].newStatus).toBe('teilbezahlt');
  });
});

describe('Payment Allocation – Concurrent Update Simulation', () => {
  test('optimistic locking: version conflict triggers retry', () => {
    let version = 1;
    let retries = 0;

    function attemptUpdate(expectedVersion: number): boolean {
      if (version !== expectedVersion) {
        retries++;
        return false; // conflict
      }
      version++;
      return true;
    }

    // First attempt: someone else updated (simulated)
    version = 2; // simulate concurrent update
    const firstAttempt = attemptUpdate(1);
    expect(firstAttempt).toBe(false);
    expect(retries).toBe(1);

    // Retry with fresh version
    const secondAttempt = attemptUpdate(2);
    expect(secondAttempt).toBe(true);
    expect(version).toBe(3);
  });
});
