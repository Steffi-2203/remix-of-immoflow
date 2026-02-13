import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerFinanceRoutes } from '../../../server/routes/finance/index';

// ── Constants ────────────────────────────────────────────────────────────
const MOCK_USER_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
const MOCK_ORG_ID = 'bbbbbbbb-1111-2222-3333-444444444444';
const MOCK_PROPERTY_ID = 'cccccccc-1111-2222-3333-444444444444';
const MOCK_EXPENSE_ID = 'dddddddd-1111-2222-3333-444444444444';

const MOCK_EXPENSE = {
  id: MOCK_EXPENSE_ID,
  propertyId: MOCK_PROPERTY_ID,
  category: 'betriebskosten_umlagefaehig',
  bezeichnung: 'Wasserkosten Q1',
  betrag: '1234.56',
  datum: '2025-03-01',
  year: 2025,
  month: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── Mocks ────────────────────────────────────────────────────────────────
const mockCreateExpense = vi.fn();
const mockUpdateExpense = vi.fn();

vi.mock('../../../server/db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  directPool: { query: vi.fn() },
}));

vi.mock('../../../server/storage', () => ({
  storage: {
    getUserRoles: vi.fn().mockResolvedValue([]),
    getProfileById: vi.fn().mockResolvedValue({
      id: 'aaaaaaaa-1111-2222-3333-444444444444',
      organizationId: 'bbbbbbbb-1111-2222-3333-444444444444',
    }),
    getProfileByEmail: vi.fn().mockResolvedValue(null),
    getExpensesByOrganization: vi.fn().mockResolvedValue([]),
    createExpense: (...args: any[]) => mockCreateExpense(...args),
    updateExpense: (...args: any[]) => mockUpdateExpense(...args),
    deleteExpense: vi.fn().mockResolvedValue(undefined),
    getDistributionKey: vi.fn().mockResolvedValue(null),
    getAccountCategories: vi.fn().mockResolvedValue([]),
    getExpensesByProperty: vi.fn().mockResolvedValue([]),
    getTransactionsByOrganization: vi.fn().mockResolvedValue([]),
    getMonthlyInvoicesByOrganization: vi.fn().mockResolvedValue([]),
    getPaymentsByOrganization: vi.fn().mockResolvedValue([]),
    getInvoicesByTenant: vi.fn().mockResolvedValue([]),
    getPaymentsByTenant: vi.fn().mockResolvedValue([]),
    getPaymentAllocationsByInvoice: vi.fn().mockResolvedValue([]),
    getPaymentsByInvoice: vi.fn().mockResolvedValue([]),
    getPaymentAllocationsByPayment: vi.fn().mockResolvedValue([]),
    getTenantsByOrganization: vi.fn().mockResolvedValue([]),
    createTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    deleteTransactionSplits: vi.fn(),
    deleteExpensesByTransactionId: vi.fn(),
    getUnit: vi.fn().mockResolvedValue(null),
    getProperty: vi.fn().mockResolvedValue(null),
    getTenant: vi.fn().mockResolvedValue(null),
    getTransaction: vi.fn().mockResolvedValue(null),
    getBankAccount: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../../server/middleware/assertOrgOwnership', () => ({
  assertOwnership: vi.fn().mockResolvedValue(null),
  assertOrgOwnership: vi.fn(),
  OrgOwnershipError: class extends Error { status = 404; },
}));

vi.mock('../../../server/lib/securityEvents', () => ({
  logOwnershipViolation: vi.fn(),
}));

vi.mock('../../../server/lib/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' } }),
}));

vi.mock('../../../server/billing/paymentService', () => ({
  paymentService: { allocatePayment: vi.fn().mockResolvedValue({}) },
}));

// ── Apps ─────────────────────────────────────────────────────────────────
const unauthApp = express();
unauthApp.use(express.json());
unauthApp.use((req, _res, next) => { (req as any).session = {}; next(); });
registerFinanceRoutes(unauthApp);

const authApp = express();
authApp.use(express.json());
authApp.use((req, _res, next) => {
  (req as any).session = { userId: MOCK_USER_ID };
  next();
});
registerFinanceRoutes(authApp);

function getAssertOwnershipMock() {
  const mod = require('../../../server/middleware/assertOrgOwnership');
  return mod.assertOwnership as ReturnType<typeof vi.fn>;
}

// ══════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Expense Routes – Validation & Business Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. POST without auth → 401
  it('POST /api/expenses without auth returns 401', async () => {
    const res = await request(unauthApp).post('/api/expenses').send({});
    expect(res.status).toBe(401);
  });

  // 2. POST with invalid category → 400
  it('POST /api/expenses with invalid category returns 400', async () => {
    const res = await request(authApp)
      .post('/api/expenses')
      .send({
        propertyId: MOCK_PROPERTY_ID,
        category: 'INVALID_CATEGORY',
        bezeichnung: 'Test',
        datum: '2025-03-01',
        year: 2025,
        month: 3,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  // 3. Successful creation → 200 with correct fields
  it('POST /api/expenses with valid data returns 200', async () => {
    getAssertOwnershipMock().mockResolvedValueOnce({ id: MOCK_PROPERTY_ID, organizationId: MOCK_ORG_ID });
    mockCreateExpense.mockResolvedValueOnce({ ...MOCK_EXPENSE });

    const res = await request(authApp)
      .post('/api/expenses')
      .send({
        propertyId: MOCK_PROPERTY_ID,
        category: 'betriebskosten_umlagefaehig',
        bezeichnung: 'Wasserkosten Q1',
        betrag: '1234.56',
        datum: '2025-03-01',
        year: 2025,
        month: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('category', 'betriebskosten_umlagefaehig');
    expect(res.body).toHaveProperty('betrag', '1234.56');
  });

  // 4. GET expenses paginated → 200 with pagination
  it('GET /api/expenses returns 200 with pagination', async () => {
    const res = await request(authApp).get('/api/expenses');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });

  // 5. PATCH expense with rounding edge case → 200
  it('PATCH /api/expenses/:id with rounding edge case returns 200', async () => {
    getAssertOwnershipMock().mockResolvedValueOnce({ ...MOCK_EXPENSE });
    mockUpdateExpense.mockResolvedValueOnce({ ...MOCK_EXPENSE, betrag: '99.99' });

    const res = await request(authApp)
      .patch(`/api/expenses/${MOCK_EXPENSE_ID}`)
      .send({ betrag: '99.99' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('betrag', '99.99');
  });

  // 6. DELETE expense with retention lock → 403
  it('DELETE /api/expenses/:id with retention lock returns 403', async () => {
    getAssertOwnershipMock().mockResolvedValueOnce({ ...MOCK_EXPENSE });

    vi.doMock('../../../server/middleware/retentionGuard', () => ({
      assertRetentionAllowed: vi.fn().mockResolvedValue({
        allowed: false,
        retentionUntil: '2035-12-31',
        standard: 'gobd',
        reason: 'Gesetzliche Aufbewahrungspflicht (GoBD, 10 Jahre)',
      }),
    }));

    const res = await request(authApp).delete(`/api/expenses/${MOCK_EXPENSE_ID}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('retentionUntil', '2035-12-31');
    expect(res.body).toHaveProperty('standard', 'gobd');
  });
});
