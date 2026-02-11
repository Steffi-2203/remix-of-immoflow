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
import { injectNonce, injectSri } from '../../server/lib/htmlTransform';

function buildApp() {
  const app = express();
  app.use(cspNonceMiddleware);
  app.get('/', (_req: Request, res: Response) => {
    const nonce = res.locals.cspNonce;
    let html = `<html><head><script>console.log("ok")</script><style>body{}</style><link rel="stylesheet" href="/app.css"></head><body>hello</body></html>`;
    html = injectNonce(html, nonce);
    res.send(html);
  });
  return app;
}

describe('CSP Nonce Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    // Default: report-only mode (CSP_REPORT_ONLY !== 'false')
    delete process.env.CSP_REPORT_ONLY;
    app = buildApp();
  });

  it('sets a CSP header with a nonce (report-only by default)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    const header =
      res.headers['content-security-policy-report-only'] ||
      res.headers['content-security-policy'];
    expect(header).toMatch(/nonce-[A-Za-z0-9+/=]+/);
  });

  it('injects nonce into script, style, and link tags in HTML', async () => {
    const res = await request(app).get('/');
    const htmlNonces = res.text.match(/nonce="([^"]+)"/g) || [];
    // Should have nonces on <script>, <style>, and <link>
    expect(htmlNonces.length).toBeGreaterThanOrEqual(3);
  });

  it('nonce in HTML matches nonce in CSP header', async () => {
    const res = await request(app).get('/');
    const htmlNonce = res.text.match(/nonce="([^"]+)"/)?.[1];
    const header =
      res.headers['content-security-policy-report-only'] ||
      res.headers['content-security-policy'];
    const headerNonce = header?.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    expect(htmlNonce).toBeTruthy();
    expect(headerNonce).toBeTruthy();
    expect(htmlNonce).toBe(headerNonce);
  });

  it('generates a unique nonce per request', async () => {
    const res1 = await request(app).get('/');
    const res2 = await request(app).get('/');
    const getHeaderNonce = (r: request.Response) => {
      const h = r.headers['content-security-policy-report-only'] || r.headers['content-security-policy'];
      return h?.match(/nonce-([A-Za-z0-9+/=]+)/)?.[1];
    };
    expect(getHeaderNonce(res1)).not.toBe(getHeaderNonce(res2));
  });

  it('sets no-cache headers to prevent nonce reuse', async () => {
    const res = await request(app).get('/');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['pragma']).toBe('no-cache');
  });

  it('includes strict-dynamic in script-src', async () => {
    const res = await request(app).get('/');
    const header =
      res.headers['content-security-policy-report-only'] ||
      res.headers['content-security-policy'];
    expect(header).toContain("'strict-dynamic'");
  });
});

describe('Report-Only mode', () => {
  it('uses Content-Security-Policy-Report-Only by default', async () => {
    delete process.env.CSP_REPORT_ONLY;
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.headers['content-security-policy-report-only']).toBeTruthy();
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});

describe('injectSri', () => {
  it('adds integrity and crossorigin attributes to matching script tags', () => {
    const html = '<script src="/assets/index-abc123.js"></script>';
    const sriMap = {
      'assets/index-abc123.js': {
        integrity: 'sha384-TESTHASH',
        crossorigin: 'anonymous',
      },
    };
    const result = injectSri(html, sriMap);
    expect(result).toContain('integrity="sha384-TESTHASH"');
    expect(result).toContain('crossorigin="anonymous"');
  });

  it('adds integrity to matching link tags', () => {
    const html = '<link rel="stylesheet" href="/assets/style-xyz.css">';
    const sriMap = {
      'assets/style-xyz.css': {
        integrity: 'sha384-CSSHASH',
        crossorigin: 'anonymous',
      },
    };
    const result = injectSri(html, sriMap);
    expect(result).toContain('integrity="sha384-CSSHASH"');
  });

  it('returns html unchanged when sriMap is empty', () => {
    const html = '<script src="/assets/foo.js"></script>';
    expect(injectSri(html, {})).toBe(html);
  });
});
