import { describe, it, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Ledger Sync & Audit Hash Chain Tests
 * Saldo invariants and integrity validation.
 */

interface LedgerEntry {
  id: string;
  tenantId: string;
  type: 'soll' | 'ist' | 'storno' | 'interest' | 'fee';
  amount: number;
  bookingDate: string;
}

function computeTenantSaldo(entries: LedgerEntry[], tenantId: string): { soll: number; ist: number; saldo: number } {
  const filtered = entries.filter(e => e.tenantId === tenantId);
  let soll = 0;
  let ist = 0;

  for (const e of filtered) {
    if (e.type === 'soll' || e.type === 'interest' || e.type === 'fee') {
      soll = roundMoney(soll + e.amount);
    } else if (e.type === 'ist') {
      ist = roundMoney(ist + e.amount);
    } else if (e.type === 'storno') {
      ist = roundMoney(ist - e.amount); // reverse payment
    }
  }

  return { soll, ist, saldo: roundMoney(soll - ist) };
}

// Simple hash chain simulation
function buildHashChain(entries: string[]): string[] {
  const hashes: string[] = [];
  let prevHash = '0';
  for (const entry of entries) {
    // Simple hash simulation (in production: SHA-256)
    const hash = `hash(${prevHash}+${entry})`;
    hashes.push(hash);
    prevHash = hash;
  }
  return hashes;
}

function verifyChain(entries: string[], hashes: string[]): boolean {
  const rebuilt = buildHashChain(entries);
  return rebuilt.every((h, i) => h === hashes[i]);
}

describe('Tenant Saldo Computation', () => {
  it('single charge → positive saldo', () => {
    const entries: LedgerEntry[] = [
      { id: '1', tenantId: 't1', type: 'soll', amount: 925, bookingDate: '2026-01-01' },
    ];
    const result = computeTenantSaldo(entries, 't1');
    expect(result.saldo).toBe(925);
  });

  it('charge + full payment → zero saldo', () => {
    const entries: LedgerEntry[] = [
      { id: '1', tenantId: 't1', type: 'soll', amount: 925, bookingDate: '2026-01-01' },
      { id: '2', tenantId: 't1', type: 'ist', amount: 925, bookingDate: '2026-01-05' },
    ];
    expect(computeTenantSaldo(entries, 't1').saldo).toBe(0);
  });

  it('overpayment → negative saldo', () => {
    const entries: LedgerEntry[] = [
      { id: '1', tenantId: 't1', type: 'soll', amount: 500, bookingDate: '2026-01-01' },
      { id: '2', tenantId: 't1', type: 'ist', amount: 700, bookingDate: '2026-01-05' },
    ];
    expect(computeTenantSaldo(entries, 't1').saldo).toBe(-200);
  });

  it('storno reverses payment', () => {
    const entries: LedgerEntry[] = [
      { id: '1', tenantId: 't1', type: 'soll', amount: 500, bookingDate: '2026-01-01' },
      { id: '2', tenantId: 't1', type: 'ist', amount: 500, bookingDate: '2026-01-05' },
      { id: '3', tenantId: 't1', type: 'storno', amount: 500, bookingDate: '2026-01-10' },
    ];
    expect(computeTenantSaldo(entries, 't1').saldo).toBe(500);
  });

  it('interest adds to soll', () => {
    const entries: LedgerEntry[] = [
      { id: '1', tenantId: 't1', type: 'soll', amount: 1000, bookingDate: '2026-01-01' },
      { id: '2', tenantId: 't1', type: 'interest', amount: 10.96, bookingDate: '2026-04-01' },
    ];
    expect(computeTenantSaldo(entries, 't1').saldo).toBe(1010.96);
  });

  it('fee adds to soll', () => {
    const entries: LedgerEntry[] = [
      { id: '1', tenantId: 't1', type: 'soll', amount: 1000, bookingDate: '2026-01-01' },
      { id: '2', tenantId: 't1', type: 'fee', amount: 5, bookingDate: '2026-02-15' },
    ];
    expect(computeTenantSaldo(entries, 't1').saldo).toBe(1005);
  });

  it('filters by tenant', () => {
    const entries: LedgerEntry[] = [
      { id: '1', tenantId: 't1', type: 'soll', amount: 500, bookingDate: '2026-01-01' },
      { id: '2', tenantId: 't2', type: 'soll', amount: 800, bookingDate: '2026-01-01' },
      { id: '3', tenantId: 't1', type: 'ist', amount: 500, bookingDate: '2026-01-05' },
    ];
    expect(computeTenantSaldo(entries, 't1').saldo).toBe(0);
    expect(computeTenantSaldo(entries, 't2').saldo).toBe(800);
  });

  it('12-month scenario sums correctly', () => {
    const entries: LedgerEntry[] = [];
    for (let m = 1; m <= 12; m++) {
      entries.push({ id: `s${m}`, tenantId: 't1', type: 'soll', amount: 925, bookingDate: `2026-${String(m).padStart(2, '0')}-01` });
      entries.push({ id: `p${m}`, tenantId: 't1', type: 'ist', amount: 925, bookingDate: `2026-${String(m).padStart(2, '0')}-05` });
    }
    expect(computeTenantSaldo(entries, 't1').saldo).toBe(0);
    expect(computeTenantSaldo(entries, 't1').soll).toBe(11100);
    expect(computeTenantSaldo(entries, 't1').ist).toBe(11100);
  });

  it('empty entries → zero saldo', () => {
    expect(computeTenantSaldo([], 't1').saldo).toBe(0);
  });
});

describe('Audit Hash Chain', () => {
  it('builds deterministic chain', () => {
    const entries = ['entry1', 'entry2', 'entry3'];
    const chain1 = buildHashChain(entries);
    const chain2 = buildHashChain(entries);
    expect(chain1).toEqual(chain2);
  });

  it('verifies valid chain', () => {
    const entries = ['a', 'b', 'c'];
    const hashes = buildHashChain(entries);
    expect(verifyChain(entries, hashes)).toBe(true);
  });

  it('detects tampered chain', () => {
    const entries = ['a', 'b', 'c'];
    const hashes = buildHashChain(entries);
    hashes[1] = 'tampered';
    expect(verifyChain(entries, hashes)).toBe(false);
  });

  it('detects entry modification', () => {
    const entries = ['a', 'b', 'c'];
    const hashes = buildHashChain(entries);
    const tampered = ['a', 'MODIFIED', 'c'];
    expect(verifyChain(tampered, hashes)).toBe(false);
  });
});
