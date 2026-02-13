import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerPropertyRoutes } from '../../../server/routes/properties/index';

// ── Constants ────────────────────────────────────────────────────────────
const MOCK_USER_ID = 'aaaaaaaa-1111-2222-3333-444444444444';
const MOCK_ORG_ID = 'bbbbbbbb-1111-2222-3333-444444444444';
const MOCK_PROPERTY_ID = 'cccccccc-1111-2222-3333-444444444444';

const MOCK_PROPERTY = {
  id: MOCK_PROPERTY_ID,
  organizationId: MOCK_ORG_ID,
  name: 'Testhaus',
  address: 'Teststraße 1',
  purchasePrice: '500000',
};

// ── Mocks ────────────────────────────────────────────────────────────────
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
    getPropertiesByOrganization: vi.fn().mockResolvedValue([]),
    getProperty: vi.fn().mockResolvedValue(null),
    getUnitsByProperty: vi.fn().mockResolvedValue([]),
    getTenantsByProperty: vi.fn().mockResolvedValue([]),
    getExpensesByProperty: vi.fn().mockResolvedValue([]),
    getUnit: vi.fn().mockResolvedValue(null),
    getTenant: vi.fn().mockResolvedValue(null),
    getMaintenanceContractsByProperty: vi.fn().mockResolvedValue([]),
    getMaintenanceTasksByProperty: vi.fn().mockResolvedValue([]),
    getInsurancePoliciesByProperty: vi.fn().mockResolvedValue([]),
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

// ── Apps ─────────────────────────────────────────────────────────────────
const unauthApp = express();
unauthApp.use(express.json());
unauthApp.use((req, _res, next) => { (req as any).session = {}; next(); });
registerPropertyRoutes(unauthApp);

const authApp = express();
authApp.use(express.json());
authApp.use((req, _res, next) => {
  (req as any).session = { userId: MOCK_USER_ID };
  next();
});
registerPropertyRoutes(authApp);

function getAssertOwnershipMock() {
  const mod = require('../../../server/middleware/assertOrgOwnership');
  return mod.assertOwnership as ReturnType<typeof vi.fn>;
}

function getStorageMock() {
  const mod = require('../../../server/storage');
  return mod.storage;
}

// ══════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════

describe('Report Routes – Validation & Business Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Vacancy report without auth → 401
  it('GET /api/properties/:id/vacancy-report without auth returns 401', async () => {
    const res = await request(unauthApp).get(`/api/properties/${MOCK_PROPERTY_ID}/vacancy-report`);
    expect(res.status).toBe(401);
  });

  // 2. Vacancy report → 200 with expected structure
  it('GET /api/properties/:id/vacancy-report returns 200 with correct structure', async () => {
    getAssertOwnershipMock().mockResolvedValueOnce({ ...MOCK_PROPERTY });
    getStorageMock().getUnitsByProperty.mockResolvedValueOnce([
      { id: 'u1', topNummer: '1', type: 'Wohnung', flaeche: '50', status: 'aktiv' },
      { id: 'u2', topNummer: '2', type: 'Wohnung', flaeche: '60', status: 'leerstand' },
    ]);
    getStorageMock().getTenantsByProperty.mockResolvedValueOnce([]);

    const res = await request(authApp)
      .get(`/api/properties/${MOCK_PROPERTY_ID}/vacancy-report?year=2025`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('vacancyRate');
    expect(res.body).toHaveProperty('totalUnits', 2);
    expect(res.body).toHaveProperty('vacantUnits');
    expect(res.body).toHaveProperty('totalArea');
  });

  // 3. Yield report for non-owned property → 403
  it('GET /api/properties/:id/yield-report for other org returns 403', async () => {
    getStorageMock().getProperty.mockResolvedValueOnce({
      ...MOCK_PROPERTY,
      organizationId: 'other-org-id',
    });

    const res = await request(authApp)
      .get(`/api/properties/${MOCK_PROPERTY_ID}/yield-report`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Zugriff');
  });

  // 4. Operations report → 200 with KPIs
  it('GET /api/properties/:id/operations-report returns 200 with KPIs', async () => {
    getStorageMock().getProperty.mockResolvedValueOnce({ ...MOCK_PROPERTY });
    getStorageMock().getUnitsByProperty.mockResolvedValueOnce([
      { id: 'u1', name: 'Top 1', unitNumber: '1', unitType: 'Wohnung', flaeche: '70', status: 'aktiv' },
    ]);
    getStorageMock().getTenantsByProperty.mockResolvedValueOnce([]);
    getStorageMock().getExpensesByProperty.mockResolvedValueOnce([]);

    const res = await request(authApp)
      .get(`/api/properties/${MOCK_PROPERTY_ID}/operations-report?year=2025`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('meta');
    expect(res.body).toHaveProperty('kpis');
    expect(res.body.kpis).toHaveProperty('totalUnits');
    expect(res.body.kpis).toHaveProperty('occupancyRate');
    expect(res.body.kpis).toHaveProperty('nettoertrag');
    expect(res.body).toHaveProperty('rentDistribution');
    expect(res.body).toHaveProperty('expenseBreakdown');
  });

  // 5. Operations report for non-owned property → 403
  it('GET /api/properties/:id/operations-report for other org returns 403', async () => {
    getStorageMock().getProperty.mockResolvedValueOnce({
      ...MOCK_PROPERTY,
      organizationId: 'other-org-id',
    });

    const res = await request(authApp)
      .get(`/api/properties/${MOCK_PROPERTY_ID}/operations-report`);

    expect(res.status).toBe(403);
  });

  // 6. Reserve compliance without auth → 401
  it('GET /api/properties/:id/reserve-compliance without auth returns 401', async () => {
    const res = await request(unauthApp).get(`/api/properties/${MOCK_PROPERTY_ID}/reserve-compliance`);
    expect(res.status).toBe(401);
  });
});
