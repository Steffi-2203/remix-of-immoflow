import { describe, it, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Concurrency & Edge Case Tests
 * Optimistic locking simulation, duplicate detection, idempotency.
 */

interface VersionedRow {
  id: string;
  version: number;
  paidAmount: number;
}

function simulateOptimisticUpdate(
  row: VersionedRow,
  expectedVersion: number,
  newPaid: number
): { success: boolean; row: VersionedRow } {
  if (row.version !== expectedVersion) {
    return { success: false, row };
  }
  return {
    success: true,
    row: { ...row, version: row.version + 1, paidAmount: roundMoney(newPaid) },
  };
}

function detectDuplicate(existing: string[], newId: string): boolean {
  return existing.includes(newId);
}

describe('Optimistic Locking', () => {
  it('succeeds with matching version', () => {
    const row: VersionedRow = { id: 'inv-1', version: 1, paidAmount: 0 };
    const result = simulateOptimisticUpdate(row, 1, 500);
    expect(result.success).toBe(true);
    expect(result.row.version).toBe(2);
    expect(result.row.paidAmount).toBe(500);
  });

  it('fails with stale version', () => {
    const row: VersionedRow = { id: 'inv-1', version: 3, paidAmount: 200 };
    const result = simulateOptimisticUpdate(row, 2, 500);
    expect(result.success).toBe(false);
    expect(result.row.paidAmount).toBe(200); // unchanged
  });

  it('retry succeeds after refresh', () => {
    let row: VersionedRow = { id: 'inv-1', version: 1, paidAmount: 0 };

    // First attempt with stale version
    const attempt1 = simulateOptimisticUpdate(row, 0, 500);
    expect(attempt1.success).toBe(false);

    // Retry with correct version
    const attempt2 = simulateOptimisticUpdate(row, 1, 500);
    expect(attempt2.success).toBe(true);
    row = attempt2.row;
    expect(row.version).toBe(2);
  });

  it('concurrent writers: second one fails', () => {
    const row: VersionedRow = { id: 'inv-1', version: 1, paidAmount: 0 };

    // Writer A reads version 1
    const writerA = simulateOptimisticUpdate(row, 1, 300);
    expect(writerA.success).toBe(true);

    // Writer B also read version 1 but row is now version 2
    const writerB = simulateOptimisticUpdate(writerA.row, 1, 400);
    expect(writerB.success).toBe(false);
  });

  it('version increments correctly through multiple updates', () => {
    let row: VersionedRow = { id: 'inv-1', version: 1, paidAmount: 0 };
    for (let i = 0; i < 10; i++) {
      const result = simulateOptimisticUpdate(row, row.version, (i + 1) * 100);
      expect(result.success).toBe(true);
      row = result.row;
    }
    expect(row.version).toBe(11);
    expect(row.paidAmount).toBe(1000);
  });
});

describe('Duplicate Payment Detection', () => {
  it('detects existing payment ID', () => {
    const existing = ['pay-001', 'pay-002', 'pay-003'];
    expect(detectDuplicate(existing, 'pay-002')).toBe(true);
  });

  it('allows new payment ID', () => {
    const existing = ['pay-001', 'pay-002'];
    expect(detectDuplicate(existing, 'pay-003')).toBe(false);
  });

  it('empty list → no duplicates', () => {
    expect(detectDuplicate([], 'pay-001')).toBe(false);
  });
});

describe('Idempotency', () => {
  it('same allocation applied twice yields same result', () => {
    const allocate = (amount: number, paid: number, total: number) => {
      const due = roundMoney(total - paid);
      const apply = roundMoney(Math.min(amount, due));
      return { apply, newPaid: roundMoney(paid + apply) };
    };

    // First application
    const r1 = allocate(500, 0, 925);
    expect(r1.apply).toBe(500);

    // If idempotent (same state), same result
    const r2 = allocate(500, 0, 925);
    expect(r2).toEqual(r1);

    // After first application, re-applying should allocate to remaining
    const r3 = allocate(500, r1.newPaid, 925);
    expect(r3.apply).toBe(425);
    expect(r3.newPaid).toBe(925);
  });
});
