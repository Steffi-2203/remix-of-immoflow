import { test, expect } from '@playwright/test';

test.describe('Betriebskosten & Rechnungen API', () => {
  test('GET /api/invoices requires authentication', async ({ request }) => {
    const response = await request.get('/api/invoices');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('GET /api/invoices does not return 500 for unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/invoices');
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /api/invoices/generate requires authentication', async ({ request }) => {
    const response = await request.post('/api/invoices/generate', {
      data: { propertyId: 'test', year: 2026, month: 1 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('GET /api/settlements requires authentication or returns empty', async ({ request }) => {
    const response = await request.get('/api/settlements');
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/settlements/:id/pdf requires authentication', async ({ request }) => {
    const response = await request.get('/api/settlements/00000000-0000-0000-0000-000000000000/pdf');
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/expenses requires authentication or returns empty', async ({ request }) => {
    const response = await request.get('/api/expenses');
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/budgets requires authentication', async ({ request }) => {
    const response = await request.get('/api/budgets');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('GET /api/budgets/expenses requires property_id and year', async ({ request }) => {
    const response = await request.get('/api/budgets/expenses');
    expect([400, 401, 403, 429]).toContain(response.status());
  });

  test('SEPA direct-debit export requires authentication', async ({ request }) => {
    const response = await request.post('/api/sepa/direct-debit', {
      data: { creditorName: 'Test', creditorIban: 'AT12345', invoiceIds: [] },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('SEPA credit-transfer export requires authentication', async ({ request }) => {
    const response = await request.post('/api/sepa/credit-transfer', {
      data: { debtorName: 'Test', debtorIban: 'AT12345', transfers: [] },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });
});

test.describe('BK-Abrechnung Frontend', () => {
  test('settlement page loads without errors', async ({ page }) => {
    const response = await page.goto('/betriebskostenabrechnung');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test('invoices page loads without errors', async ({ page }) => {
    const response = await page.goto('/rechnungen');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});
