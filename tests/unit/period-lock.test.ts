import { describe, test, expect } from 'vitest';
import { PeriodLockError, assertPeriodOpen } from '../../server/middleware/periodLock';

describe('Period Lock', () => {
  test('PeriodLockError has correct status and message', () => {
    const err = new PeriodLockError(2025, 3);
    expect(err.status).toBe(409);
    expect(err.message).toContain('3/2025');
    expect(err.message).toContain('gesperrt');
    expect(err.name).toBe('PeriodLockError');
  });

  test('assertPeriodOpen does not throw for non-existent period (unlocked by default)', async () => {
    // A period that doesn't exist in the DB should not be locked
    await expect(
      assertPeriodOpen({
        organizationId: '00000000-0000-0000-0000-000000000001',
        year: 1900,
        month: 1,
      })
    ).resolves.toBeUndefined();
  });
});
