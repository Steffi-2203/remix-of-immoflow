import { test, expect } from '@playwright/test';

test.describe('Health & Readiness', () => {
  test('GET /api/health returns 200 with status or falls through to SPA', async ({ request }) => {
    const response = await request.get('/api/health');
    const status = response.status();
    expect(status).toBeLessThan(500);

    if (status === 200) {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json')) {
        const body = await response.json();
        expect(body).toHaveProperty('status');
      }
    }
  });

  test('serves the frontend on /', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
  });

  test('unknown API routes are handled gracefully', async ({ request }) => {
    const response = await request.get('/api/nonexistent-endpoint-xyz');
    expect(response.status()).toBeLessThan(500);
  });
});
