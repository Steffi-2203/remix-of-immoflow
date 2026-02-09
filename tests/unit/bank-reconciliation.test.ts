import { describe, it, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Bank Reconciliation Tests
 * Fuzzy matching, transaction assignment, balance tracking.
 */

interface BankTransaction {
  id: string;
  amount: number;
  reference: string;
  date: string;
}

interface Tenant {
  id: string;
  name: string;
  iban?: string;
  expectedAmount: number;
}

function normalizeReference(ref: string): string {
  return ref.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
}

function fuzzyMatch(reference: string, tenantName: string, threshold: number = 0.7): boolean {
  const normRef = normalizeReference(reference);
  const normName = normalizeReference(tenantName);
  if (normRef.includes(normName) || normName.includes(normRef)) return true;

  // Bigram overlap score for better accuracy
  const getBigrams = (s: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) bigrams.add(s.slice(i, i + 2));
    return bigrams;
  };
  const refBigrams = getBigrams(normRef);
  const nameBigrams = getBigrams(normName);
  if (nameBigrams.size === 0) return false;
  let matches = 0;
  for (const b of nameBigrams) {
    if (refBigrams.has(b)) matches++;
  }
  return matches / nameBigrams.size >= threshold;
}

function matchTransaction(tx: BankTransaction, tenants: Tenant[]): {
  tenantId: string | null;
  confidence: 'exact' | 'fuzzy' | 'amount' | 'none';
} {
  // Exact name match in reference
  for (const t of tenants) {
    if (normalizeReference(tx.reference).includes(normalizeReference(t.name))) {
      return { tenantId: t.id, confidence: 'exact' };
    }
  }

  // Fuzzy match
  for (const t of tenants) {
    if (fuzzyMatch(tx.reference, t.name)) {
      return { tenantId: t.id, confidence: 'fuzzy' };
    }
  }

  // Amount match (unique)
  const amountMatches = tenants.filter(t => t.expectedAmount === tx.amount);
  if (amountMatches.length === 1) {
    return { tenantId: amountMatches[0].id, confidence: 'amount' };
  }

  return { tenantId: null, confidence: 'none' };
}

function reconcileBalance(openingBalance: number, transactions: BankTransaction[]): number {
  return roundMoney(
    transactions.reduce((bal, tx) => roundMoney(bal + tx.amount), openingBalance)
  );
}

describe('Reference Normalization', () => {
  it('lowercases and strips special chars', () => {
    expect(normalizeReference('Miete Jan 2026 - Müller')).toBe('mietejan2026müller');
  });

  it('handles empty string', () => {
    expect(normalizeReference('')).toBe('');
  });

  it('preserves umlauts', () => {
    expect(normalizeReference('Höfer-Straße')).toBe('höferstraße');
  });
});

describe('Fuzzy Matching', () => {
  it('exact substring match', () => {
    expect(fuzzyMatch('Miete Mueller Hans', 'Mueller')).toBe(true);
  });

  it('rejects unrelated text', () => {
    expect(fuzzyMatch('Strom Rechnung Wien Energie', 'Mueller Hans')).toBe(false);
  });

  it('handles case insensitivity', () => {
    expect(fuzzyMatch('MIETE SCHMIDT', 'Schmidt')).toBe(true);
  });
});

describe('Transaction Matching', () => {
  const tenants: Tenant[] = [
    { id: 't1', name: 'Hans Mueller', expectedAmount: 925 },
    { id: 't2', name: 'Maria Schmidt', expectedAmount: 750 },
    { id: 't3', name: 'Franz Huber', expectedAmount: 925 }, // same amount as t1
  ];

  it('exact match by name in reference', () => {
    const tx: BankTransaction = { id: 'tx1', amount: 925, reference: 'Miete Jan Hans Mueller', date: '2026-01-05' };
    const result = matchTransaction(tx, tenants);
    expect(result.tenantId).toBe('t1');
    expect(result.confidence).toBe('exact');
  });

  it('amount match when unique', () => {
    const tx: BankTransaction = { id: 'tx2', amount: 750, reference: 'Dauerauftrag', date: '2026-01-05' };
    const result = matchTransaction(tx, tenants);
    expect(result.tenantId).toBe('t2');
    expect(result.confidence).toBe('amount');
  });

  it('no match for ambiguous amount', () => {
    const tx: BankTransaction = { id: 'tx3', amount: 925, reference: 'Dauerauftrag', date: '2026-01-05' };
    const result = matchTransaction(tx, tenants);
    // 925 matches both t1 and t3 → no unique match
    expect(result.confidence).toBe('none');
  });

  it('no match for unknown reference and amount', () => {
    const tx: BankTransaction = { id: 'tx4', amount: 1234.56, reference: 'Random Transfer', date: '2026-01-05' };
    const result = matchTransaction(tx, tenants);
    expect(result.tenantId).toBeNull();
  });
});

describe('Balance Reconciliation', () => {
  it('opening + deposits = closing balance', () => {
    const transactions: BankTransaction[] = [
      { id: '1', amount: 925, reference: 'Miete', date: '2026-01-05' },
      { id: '2', amount: 750, reference: 'Miete', date: '2026-01-05' },
      { id: '3', amount: -1200, reference: 'Betriebskosten Abrechnung', date: '2026-01-10' },
    ];
    expect(reconcileBalance(10000, transactions)).toBe(10475);
  });

  it('no transactions → balance unchanged', () => {
    expect(reconcileBalance(5000, [])).toBe(5000);
  });

  it('handles cent precision', () => {
    const transactions: BankTransaction[] = [
      { id: '1', amount: 33.33, reference: 'a', date: '2026-01-01' },
      { id: '2', amount: 33.33, reference: 'b', date: '2026-01-01' },
      { id: '3', amount: 33.34, reference: 'c', date: '2026-01-01' },
    ];
    expect(reconcileBalance(0, transactions)).toBe(100);
  });
});
