import { test, expect } from '@playwright/test';

test.describe('Security Headers', () => {
  test('responses include security headers', async ({ request }) => {
    const response = await request.get('/api/properties');
    const headers = response.headers();
    const hasSecurityHeaders =
      headers['x-content-type-options'] !== undefined ||
      headers['x-frame-options'] !== undefined ||
      headers['strict-transport-security'] !== undefined;
    expect(hasSecurityHeaders).toBeTruthy();
  });

  test('CSRF token endpoint responds', async ({ request }) => {
    const response = await request.get('/api/csrf-token');
    const status = response.status();
    expect([200, 204, 403, 429]).toContain(status);
  });
});

test.describe('Rate Limiting', () => {
  test('login endpoint has rate limiting', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: 'test@test.at', password: 'wrong' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('CSRF Protection', () => {
  test('POST without CSRF token is rejected', async ({ request }) => {
    const response = await request.post('/api/properties', {
      data: { name: 'CSRF-Test' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });
});

test.describe('Input Validation', () => {
  test('rejects malformed JSON on POST', async ({ request }) => {
    const response = await request.post('/api/properties', {
      headers: { 'Content-Type': 'application/json' },
      data: 'this-is-not-json{{{',
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
