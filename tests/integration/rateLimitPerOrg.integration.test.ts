import request from 'supertest';
import { beforeAll, afterAll, test, expect } from 'vitest';
import express from 'express';
import Redis from 'ioredis';
import { rateLimitPerOrg } from '../../server/middleware/rateLimitPerOrg';

const redis = new Redis(process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379');
let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(rateLimitPerOrg);
  app.post('/api/payments', (_req, res) => res.status(201).json({ ok: true }));
});

afterAll(async () => {
  await redis.quit();
});

test('blocks after route limit per org', async () => {
  const orgId = 'test-org-rl';
  // ensure clean key
  await redis.del(`rate:org:${orgId}:/api/payments`);

  // payments route has capacity 60 per minute in resolveLimitConfig
  for (let i = 0; i < 60; i++) {
    const r = await request(app).post('/api/payments').set('x-org-id', orgId).send({});
    expect(r.status).toBe(201);
  }

  // next request should be 429
  const blocked = await request(app).post('/api/payments').set('x-org-id', orgId).send({});
  expect(blocked.status).toBe(429);
  expect(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
});
