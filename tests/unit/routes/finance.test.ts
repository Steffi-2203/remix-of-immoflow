import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerFinanceRoutes } from '../../../server/routes/finance/index';

vi.mock('../../../server/db', () => ({
  db: { execute: vi.fn().mockResolvedValue({ rows: [] }) },
  directPool: { query: vi.fn() },
}));
vi.mock('../../../server/storage', () => ({
  storage: { getUserRoles: vi.fn().mockResolvedValue([]) },
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).session = {}; next(); });
registerFinanceRoutes(app);

describe('Finance Router', () => {
  it('GET /api/payments without auth returns 401', async () => {
    const res = await request(app).get('/api/payments');
    expect(res.status).toBe(401);
  });

  it('POST /api/payments without auth returns 401', async () => {
    const res = await request(app).post('/api/payments').send({ amount: 100 });
    expect(res.status).toBe(401);
  });
});
