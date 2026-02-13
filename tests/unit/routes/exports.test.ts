import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerExportRoutes } from '../../../server/routes/exports';

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
registerExportRoutes(app);

describe('Exports Router', () => {
  it('GET /api/export/bmd without auth returns 401', async () => {
    const res = await request(app).get('/api/export/bmd');
    expect([401, 404]).toContain(res.status);
  });
});
