import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerFinanceRoutes } from '../../../server/routes/finance/index';

// ── Constants ────────────────────────────────────────────────────────────
const MOCK_USER_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
const MOCK_INVOICE_ID = 'eeeeeeee-1111-2222-3333-444444444444';

// ── Mocks ────────────────────────────────────────────────────────────────
const mockDbUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
});

vi.mock('../../../server/db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    update: (...args: any[]) => mockDbUpdate(...args),
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
    getMonthlyInvoicesByOrganization: vi.fn().mockResolvedValue([]),
    getTransactionsByOrganization: vi.fn().mockResolvedValue([]),
    getPaymentsByOrganization: vi.fn().mockResolvedValue([]),
    getExpensesByOrganization: vi.fn().mockResolvedValue([]),
    getExpensesByProperty: vi.fn().mockResolvedValue([]),
    getAccountCategories: vi.fn().mockResolvedValue([]),
    getDistributionKey: vi.fn().mockResolvedValue(null),
    createTransaction: vi.fn(),
    createExpense: vi.fn(),
    deleteTransaction: vi.fn(),
    deleteTransactionSplits: vi.fn(),
    deleteExpensesByTransactionId: vi.fn(),
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

const mockSendEmail = vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' } });
vi.mock('../../../server/lib/resend', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
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

describe('Dunning Routes – Validation & Business Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. POST send-dunning without auth → 401
  it('POST /api/functions/send-dunning without auth returns 401', async () => {
    const res = await request(unauthApp).post('/api/functions/send-dunning').send({});
    expect(res.status).toBe(401);
  });

  // 2. POST send-dunning with missing tenant email → 400
  it('POST /api/functions/send-dunning without tenantEmail returns 400', async () => {
    getAssertOwnershipMock().mockResolvedValueOnce({ id: MOCK_INVOICE_ID });

    const res = await request(authApp)
      .post('/api/functions/send-dunning')
      .send({
        invoiceId: MOCK_INVOICE_ID,
        dunningLevel: 1,
        // no tenantEmail
        tenantName: 'Max Mustermann',
        propertyName: 'Testhaus',
        unitNumber: '3',
        amount: 500,
        dueDate: '2025-03-05',
        invoiceMonth: 3,
        invoiceYear: 2025,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('E-Mail');
  });

  // 3. Successful Zahlungserinnerung (level 1) → 200
  it('POST /api/functions/send-dunning level 1 returns 200 and sends email', async () => {
    getAssertOwnershipMock().mockResolvedValueOnce({ id: MOCK_INVOICE_ID });

    const res = await request(authApp)
      .post('/api/functions/send-dunning')
      .send({
        invoiceId: MOCK_INVOICE_ID,
        dunningLevel: 1,
        tenantEmail: 'mieter@test.at',
        tenantName: 'Max Mustermann',
        propertyName: 'Testhaus',
        unitNumber: '3',
        amount: 500,
        dueDate: '2025-03-05',
        invoiceMonth: 3,
        invoiceYear: 2025,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Zahlungserinnerung');
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'mieter@test.at',
        subject: expect.stringContaining('Zahlungserinnerung'),
      })
    );
  });

  // 4. Mahnung (level 2) → 200 with correct subject
  it('POST /api/functions/send-dunning level 2 returns 200 with Mahnung subject', async () => {
    getAssertOwnershipMock().mockResolvedValueOnce({ id: MOCK_INVOICE_ID });

    const res = await request(authApp)
      .post('/api/functions/send-dunning')
      .send({
        invoiceId: MOCK_INVOICE_ID,
        dunningLevel: 2,
        tenantEmail: 'mieter@test.at',
        tenantName: 'Max Mustermann',
        propertyName: 'Testhaus',
        unitNumber: '3',
        amount: 500,
        dueDate: '2025-03-05',
        invoiceMonth: 3,
        invoiceYear: 2025,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Mahnung');
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('MAHNUNG'),
      })
    );
  });

  // 5. Dunning for other org invoice → 404 (assertOwnership blocks)
  it('POST /api/functions/send-dunning for non-owned invoice returns 404', async () => {
    getAssertOwnershipMock().mockImplementationOnce(async (_req: any, res: any) => {
      res.status(404).json({ error: 'Not found' });
      return null;
    });

    const res = await request(authApp)
      .post('/api/functions/send-dunning')
      .send({
        invoiceId: MOCK_INVOICE_ID,
        dunningLevel: 1,
        tenantEmail: 'mieter@test.at',
        tenantName: 'Max',
        propertyName: 'Haus',
        unitNumber: '1',
        amount: 100,
        dueDate: '2025-01-05',
        invoiceMonth: 1,
        invoiceYear: 2025,
      });

    expect(res.status).toBe(404);
  });

  // 6. Validate-invoice with missing bruttobetrag → invalid
  it('POST /api/functions/validate-invoice with missing bruttobetrag returns invalid', async () => {
    const res = await request(authApp)
      .post('/api/functions/validate-invoice')
      .send({
        daten: {
          lieferant: 'Test GmbH',
          bruttobetrag: 0,
          ust_satz: 20,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.validierungsbericht.ist_valide).toBe(false);
    expect(res.body.validierungsbericht.gefundene_fehler).toEqual(
      expect.arrayContaining([expect.stringContaining('bruttobetrag')])
    );
  });
});
