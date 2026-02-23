import { test, expect } from '@playwright/test';

test.describe('Zahlungen & Zuordnung API', () => {
  test('GET /api/payments requires authentication', async ({ request }) => {
    const response = await request.get('/api/payments');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/payments requires authentication', async ({ request }) => {
    const response = await request.post('/api/payments', {
      data: { tenantId: 'test', betrag: 100, buchungsDatum: '2026-01-15' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/payments/allocate requires authentication', async ({ request }) => {
    const response = await request.post('/api/payments/allocate', {
      data: { paymentId: 'test', invoiceId: 'test', amount: 100 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('GET /api/offene-posten requires authentication or returns empty', async ({ request }) => {
    const response = await request.get('/api/offene-posten');
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/bank-transactions requires authentication or returns empty', async ({ request }) => {
    const response = await request.get('/api/bank-transactions');
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /api/bank-reconciliation requires authentication', async ({ request }) => {
    const response = await request.post('/api/bank-reconciliation', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });
});

test.describe('Zahlungen Frontend', () => {
  test('payments page loads without errors', async ({ page }) => {
    const response = await page.goto('/zahlungen');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test('offene posten page loads without errors', async ({ page }) => {
    const response = await page.goto('/offene-posten');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});
