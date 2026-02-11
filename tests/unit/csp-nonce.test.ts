import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';

// Mock logger and prometheus before importing csp middleware
vi.mock('../../server/lib/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock('../../server/lib/prometheus', () => ({
  registry: {
    increment: vi.fn(),
    register: vi.fn(),
  },
}));

import { cspNonceMiddleware } from '../../server/middleware/csp';

function buildApp() {
  const app = express();
  app.use(cspNonceMiddleware);
  app.get('/', (_req: Request, res: Response) => {
    const nonce = res.locals.cspNonce;
    res.send(`<html><head><script nonce="${nonce}">console.log("ok")</script></head><body>hello</body></html>`);
  });
  return app;
}

describe('CSP Nonce Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = buildApp();
  });

  it('sets Content-Security-Policy header with a nonce', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toMatch(/nonce-[A-Za-z0-9+/=]+/);
  });

  it('injects nonce into HTML body via res.locals.cspNonce', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('nonce="');
    // Extract nonce from HTML and CSP header — they must match
    const htmlNonce = res.text.match(/nonce="([^"]+)"/)?.[1];
    const headerNonce = res.headers['content-security-policy'].match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    expect(htmlNonce).toBeTruthy();
    expect(headerNonce).toBeTruthy();
    expect(htmlNonce).toBe(headerNonce);
  });

  it('generates a unique nonce per request', async () => {
    const res1 = await request(app).get('/');
    const res2 = await request(app).get('/');
    const nonce1 = res1.headers['content-security-policy'].match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    const nonce2 = res2.headers['content-security-policy'].match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    expect(nonce1).not.toBe(nonce2);
  });

  it('sets no-cache headers to prevent nonce reuse', async () => {
    const res = await request(app).get('/');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['pragma']).toBe('no-cache');
  });

  it('includes strict-dynamic in script-src', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy']).toContain("'strict-dynamic'");
  });
});
