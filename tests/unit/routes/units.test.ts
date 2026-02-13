import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerUnitRoutes } from '../../../server/routes/units';

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
registerUnitRoutes(app);

describe('Units Router', () => {
  it('GET /api/units without auth returns 401', async () => {
    const res = await request(app).get('/api/units');
    expect(res.status).toBe(401);
  });
});
