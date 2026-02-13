import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerBankingRoutes } from '../../../server/routes/banking';

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
registerBankingRoutes(app);

describe('Banking Router', () => {
  it('GET /api/bank-accounts without auth returns 401', async () => {
    const res = await request(app).get('/api/bank-accounts');
    expect(res.status).toBe(401);
  });
});
