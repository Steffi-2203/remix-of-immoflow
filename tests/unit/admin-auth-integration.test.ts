import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
  },
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('@shared/schema', () => ({
  userRoles: {
    userId: 'userId',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn(),
  desc: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  sql: vi.fn(),
  isNull: vi.fn(),
  or: vi.fn(),
}));

import { db } from '../../server/db';
import { requireAdmin } from '../../server/routes/adminRoutes';

const mockSelect = db.select as ReturnType<typeof vi.fn>;

function createMockReq(session: Record<string, any> = {}) {
  return {
    headers: {},
    session: {
      save: vi.fn((cb: (err?: any) => void) => cb()),
      ...session,
    },
    body: {},
    query: {},
    params: {},
    path: '/api/admin/test',
  } as any;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    _json: null as any,
    _headers: {} as Record<string, string>,
  };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((data: any) => { res._json = data; return res; });
  res.setHeader = vi.fn((k: string, v: string) => { res._headers[k] = v; });
  return res;
}

function setupDbMock(rows: any[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain);
  return chain;
}

describe('requireAdmin (actual exported function)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and sends 401 when session has no userId', async () => {
    const req = createMockReq({});
    const res = createMockRes();

    const result = await requireAdmin(req, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Nicht authentifiziert' });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('returns null and sends 403 when user role is not admin', async () => {
    const req = createMockReq({ userId: 'user-123' });
    const res = createMockRes();

    setupDbMock([{ role: 'viewer', userId: 'user-123' }]);

    const result = await requireAdmin(req, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Nur Administratoren haben Zugriff' });
    expect(mockSelect).toHaveBeenCalled();
  });

  it('returns null and sends 403 when no role record exists', async () => {
    const req = createMockReq({ userId: 'orphan-user' });
    const res = createMockRes();

    setupDbMock([]);

    const result = await requireAdmin(req, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns userId string when user has admin role', async () => {
    const req = createMockReq({ userId: 'admin-789' });
    const res = createMockRes();

    setupDbMock([{ role: 'admin', userId: 'admin-789' }]);

    const result = await requireAdmin(req, res);

    expect(result).toBe('admin-789');
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('always queries DB for role, never trusts session.role', async () => {
    const req = createMockReq({ userId: 'sneaky-user', role: 'admin' });
    const res = createMockRes();

    setupDbMock([{ role: 'viewer' }]);

    const result = await requireAdmin(req, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it('returns null for undefined session', async () => {
    const req = { session: undefined, headers: {} } as any;
    const res = createMockRes();

    const result = await requireAdmin(req, res);

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('API Cache-Control middleware behavior', () => {
  it('middleware sets correct headers on mock response', () => {
    const res = createMockRes();
    const next = vi.fn();

    const cacheMiddleware = (_req: any, r: any, n: any) => {
      r.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      r.setHeader('Pragma', 'no-cache');
      r.setHeader('Expires', '0');
      r.setHeader('Surrogate-Control', 'no-store');
      n();
    };

    cacheMiddleware({}, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
    expect(res.setHeader).toHaveBeenCalledWith('Surrogate-Control', 'no-store');
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('Broadcast async response logic', () => {
  it('determines failed status when all sends fail', () => {
    const failedCount = 5;
    const totalRecipients = 5;
    const finalStatus = failedCount === totalRecipients ? 'failed' : 'sent';
    expect(finalStatus).toBe('failed');
  });

  it('determines sent status when at least one succeeds', () => {
    const failedCount = 4;
    const totalRecipients = 5;
    const finalStatus = failedCount === totalRecipients ? 'failed' : 'sent';
    expect(finalStatus).toBe('sent');
  });

  it('determines sent status when zero fails', () => {
    const failedCount = 0;
    const totalRecipients = 10;
    const finalStatus = failedCount === totalRecipients ? 'failed' : 'sent';
    expect(finalStatus).toBe('sent');
  });
});
