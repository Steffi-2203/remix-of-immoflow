import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerCoreRoutes } from '../../../server/routes/core';

// Mock DB
vi.mock('../../../server/db', () => ({
  db: { execute: vi.fn().mockResolvedValue({ rows: [{ pending: 0, running: 0, failed: 0 }] }) },
  directPool: { query: vi.fn() },
}));
vi.mock('../../../server/lib/metrics', () => ({
  metrics: { snapshot: () => ({ totalRuns: 0, avgDuration: 0 }) },
}));

const app = express();
registerCoreRoutes(app);

describe('Core Router', () => {
  it('GET /api/health returns 200 + timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/metrics returns uptime', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uptime');
  });
});
