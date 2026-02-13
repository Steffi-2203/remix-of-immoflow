import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerPropertyRoutes } from '../../../server/routes/properties/index';

vi.mock('../../../server/db', () => ({
  db: { execute: vi.fn().mockResolvedValue({ rows: [] }), select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) },
  directPool: { query: vi.fn() },
}));
vi.mock('../../../server/storage', () => ({
  storage: { getUserRoles: vi.fn().mockResolvedValue([]) },
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).session = {}; next(); });
registerPropertyRoutes(app);

describe('Properties Router', () => {
  it('GET /api/properties without auth returns 401', async () => {
    const res = await request(app).get('/api/properties');
    expect(res.status).toBe(401);
  });
});
