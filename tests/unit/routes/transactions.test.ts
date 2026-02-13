import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerFinanceRoutes } from '../../../server/routes/finance/index';

// ── Constants ────────────────────────────────────────────────────────────
const MOCK_USER_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
const MOCK_ORG_ID = 'bbbbbbbb-1111-2222-3333-444444444444';
const MOCK_BANK_ACCOUNT_ID = 'cccccccc-1111-2222-3333-444444444444';
const MOCK_TX_ID = 'dddddddd-1111-2222-3333-444444444444';

const MOCK_TRANSACTION = {
  id: MOCK_TX_ID,
  organizationId: MOCK_ORG_ID,
  bankAccountId: MOCK_BANK_ACCOUNT_ID,
  amount: '150.00',
  transactionDate: '2025-03-15',
  bookingText: 'Miete März',
  partnerName: 'Max Mustermann',
  createdAt: new Date().toISOString(),
};

// ── Mocks ────────────────────────────────────────────────────────────────
const mockCreateTransaction = vi.fn();

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
    getTransactionsByOrganization: vi.fn().mockResolvedValue([]),
    createTransaction: (...args: any[]) => mockCreateTransaction(...args),
    deleteTransaction: vi.fn().mockResolvedValue(undefined),
    deleteTransactionSplits: vi.fn().mockResolvedValue(undefined),
    deleteExpensesByTransactionId: vi.fn().mockResolvedValue(undefined),
    getMonthlyInvoicesByOrganization: vi.fn().mockResolvedValue([]),
    getPaymentsByOrganization: vi.fn().mockResolvedValue([]),
    getExpensesByOrganization: vi.fn().mockResolvedValue([]),
    getProfileByEmail: vi.fn().mockResolvedValue(null),
    getAccountCategories: vi.fn().mockResolvedValue([]),
    getDistributionKey: vi.fn().mockResolvedValue(null),
    getExpensesByProperty: vi.fn().mockResolvedValue([]),
    getInvoicesByTenant: vi.fn().mockResolvedValue([]),
    getPaymentsByTenant: vi.fn().mockResolvedValue([]),
    getPaymentAllocationsByInvoice: vi.fn().mockResolvedValue([]),
    getPaymentsByInvoice: vi.fn().mockResolvedValue([]),
    getPaymentAllocationsByPayment: vi.fn().mockResolvedValue([]),
    getTenantsByOrganization: vi.fn().mockResolvedValue([]),
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

describe('Transaction Routes – Validation & Business Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. POST with missing required fields → 400
  it('POST /api/transactions with missing amount returns 400', async () => {
    const res = await request(authApp)
      .post('/api/transactions')
      .send({ transactionDate: '2025-03-15' }); // no amount

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  // 2. POST with missing transactionDate → 400
  it('POST /api/transactions with missing transactionDate returns 400', async () => {
    const res = await request(authApp)
      .post('/api/transactions')
      .send({ amount: '100.00' }); // no transactionDate

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  // 3. Successful creation → 200
  it('POST /api/transactions with valid data returns 200', async () => {
    // bankAccountId ownership check
    getAssertOwnershipMock().mockResolvedValueOnce({ id: MOCK_BANK_ACCOUNT_ID });
    mockCreateTransaction.mockResolvedValueOnce({ ...MOCK_TRANSACTION });

    const res = await request(authApp)
      .post('/api/transactions')
      .send({
        bankAccountId: MOCK_BANK_ACCOUNT_ID,
        amount: '150.00',
        transactionDate: '2025-03-15',
        bookingText: 'Miete März',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('amount', '150.00');
  });

  // 4. GET transactions list → 200 with pagination
  it('GET /api/transactions returns 200 with paginated data', async () => {
    const res = await request(authApp).get('/api/transactions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });

  // 5. GET transaction without auth → 401
  it('GET /api/transactions without auth returns 401', async () => {
    const res = await request(unauthApp).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  // 6. Unauthorized access to another org transaction → 404 (assertOwnership returns null)
  it('GET /api/transactions/:id for non-owned resource returns 404', async () => {
    // assertOwnership returns null → route sends 404 via assertOwnership
    getAssertOwnershipMock().mockImplementationOnce(async (_req: any, res: any) => {
      res.status(404).json({ error: 'Not found' });
      return null;
    });

    const res = await request(authApp).get(`/api/transactions/${MOCK_TX_ID}`);
    expect(res.status).toBe(404);
  });
});
