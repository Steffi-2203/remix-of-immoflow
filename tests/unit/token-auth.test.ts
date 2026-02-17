import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from '../../server/db';
import { tokenAuthMiddleware } from '../../server/middleware/tokenAuth';

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

function createMockReq(overrides: Record<string, any> = {}) {
  return {
    headers: {},
    session: {
      save: vi.fn((cb: (err?: any) => void) => cb()),
    },
    ...overrides,
  };
}

function createMockRes() {
  return {};
}

describe('tokenAuthMiddleware', () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it('skips token lookup when session already has userId', async () => {
    const req = createMockReq({ session: { userId: 'existing-user', save: vi.fn() } });
    await tokenAuthMiddleware(req as any, createMockRes() as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('calls next without setting anything when no auth header', async () => {
    const req = createMockReq();
    await tokenAuthMiddleware(req as any, createMockRes() as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockQuery).not.toHaveBeenCalled();
    expect((req.session as any).userId).toBeUndefined();
  });

  it('calls next without setting anything for invalid Bearer format', async () => {
    const req = createMockReq({ headers: { authorization: 'Basic abc123' } });
    await tokenAuthMiddleware(req as any, createMockRes() as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('sets userId, tokenUserId, email, organizationId for valid token', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const email = 'test@example.com';
    const orgId = '22222222-2222-2222-2222-222222222222';

    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: userId }] })
      .mockResolvedValueOnce({ rows: [{ email, organization_id: orgId }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = createMockReq({ headers: { authorization: 'Bearer valid-token-123' } });
    await tokenAuthMiddleware(req as any, createMockRes() as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).tokenUserId).toBe(userId);
    expect((req.session as any).userId).toBe(userId);
    expect((req.session as any).email).toBe(email);
    expect((req.session as any).organizationId).toBe(orgId);
    expect(req.session.save).toHaveBeenCalled();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('auth_tokens'),
      ['valid-token-123']
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('profiles'),
      [userId]
    );
  });

  it('sets userId but not email/organizationId when no profile found', async () => {
    const userId = '33333333-3333-3333-3333-333333333333';

    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: userId }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const req = createMockReq({ headers: { authorization: 'Bearer token-no-profile' } });
    await tokenAuthMiddleware(req as any, createMockRes() as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).tokenUserId).toBe(userId);
    expect((req.session as any).userId).toBe(userId);
    expect((req.session as any).email).toBeUndefined();
    expect((req.session as any).organizationId).toBeUndefined();
  });

  it('calls next without setting anything for expired/invalid token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = createMockReq({ headers: { authorization: 'Bearer expired-token' } });
    await tokenAuthMiddleware(req as any, createMockRes() as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).tokenUserId).toBeUndefined();
    expect((req.session as any).userId).toBeUndefined();
  });

  it('logs error and calls next on database error (graceful failure)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    const req = createMockReq({ headers: { authorization: 'Bearer some-token' } });
    await tokenAuthMiddleware(req as any, createMockRes() as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[TokenAuth] Error resolving token:',
      expect.any(Error)
    );
    expect((req as any).tokenUserId).toBeUndefined();

    consoleSpy.mockRestore();
  });

  it('logs error on session.save failure but still resolves', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const userId = '44444444-4444-4444-4444-444444444444';
    const saveError = new Error('session store unavailable');

    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: userId }] })
      .mockResolvedValueOnce({ rows: [{ email: 'a@b.com', organization_id: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = createMockReq({
      headers: { authorization: 'Bearer save-error-token' },
      session: {
        save: vi.fn((cb: (err?: any) => void) => cb(saveError)),
      },
    });

    await tokenAuthMiddleware(req as any, createMockRes() as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).tokenUserId).toBe(userId);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[TokenAuth] Session save error:',
      saveError
    );

    consoleSpy.mockRestore();
  });
});
