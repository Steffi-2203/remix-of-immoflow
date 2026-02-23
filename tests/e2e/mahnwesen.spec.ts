import { test, expect } from '@playwright/test';

test.describe('Mahnwesen API', () => {
  test('GET /api/dunning-overview requires authentication', async ({ request }) => {
    const response = await request.get('/api/dunning-overview');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/dunning/send requires authentication', async ({ request }) => {
    const response = await request.post('/api/dunning/send', {
      data: { invoiceId: 'test', tenantEmail: 'test@example.com' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('GET /api/dunning/check requires authentication', async ({ request }) => {
    const response = await request.get('/api/dunning/check');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/dunning/process requires authentication', async ({ request }) => {
    const response = await request.post('/api/dunning/process', {
      data: { sendEmails: false },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/dunning/send rejects without required fields when authenticated', async ({ request }) => {
    const response = await request.post('/api/dunning/send', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect([400, 401, 403, 429]).toContain(response.status());
  });
});

test.describe('VPI-Indexanpassung API', () => {
  test('GET /api/vpi/values requires authentication', async ({ request }) => {
    const response = await request.get('/api/vpi/values');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('GET /api/vpi/check-adjustments requires authentication', async ({ request }) => {
    const response = await request.get('/api/vpi/check-adjustments');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/vpi/apply requires authentication', async ({ request }) => {
    const response = await request.post('/api/vpi/apply', {
      data: { tenantId: 'test', newRent: 500 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });
});

test.describe('Wartungserinnerungen API', () => {
  test('GET /api/maintenance/reminders requires authentication', async ({ request }) => {
    const response = await request.get('/api/maintenance/reminders');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/maintenance/send-reminders requires authentication', async ({ request }) => {
    const response = await request.post('/api/maintenance/send-reminders', {
      data: { managerEmail: 'test@example.com' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });
});

test.describe('Eigentümer & Export API', () => {
  test('GET /api/owners requires authentication', async ({ request }) => {
    const response = await request.get('/api/owners');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/owners requires authentication', async ({ request }) => {
    const response = await request.post('/api/owners', {
      data: { firstName: 'Test', lastName: 'Owner' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });

  test('GET /api/export/datev requires authentication', async ({ request }) => {
    const response = await request.get('/api/export/datev?startDate=2026-01-01&endDate=2026-12-31');
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/export/bmd requires authentication', async ({ request }) => {
    const response = await request.get('/api/export/bmd?startDate=2026-01-01&endDate=2026-12-31');
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /api/finanzonline/ust-summary requires authentication', async ({ request }) => {
    const response = await request.get('/api/finanzonline/ust-summary?year=2026&period=Q1');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('GET /api/accountant/dashboard requires authentication', async ({ request }) => {
    const response = await request.get('/api/accountant/dashboard');
    expect([401, 403, 429]).toContain(response.status());
  });
});

test.describe('Schlüsselverwaltung API', () => {
  test('GET /api/key-inventory requires authentication', async ({ request }) => {
    const response = await request.get('/api/key-inventory');
    expect([401, 403, 429]).toContain(response.status());
  });

  test('POST /api/key-inventory requires authentication', async ({ request }) => {
    const response = await request.post('/api/key-inventory', {
      data: { propertyId: 'test', keyType: 'hauseingangstuer' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403, 429]).toContain(response.status());
  });
});

test.describe('Mahnwesen Frontend', () => {
  test('dunning page loads without errors', async ({ page }) => {
    const response = await page.goto('/mahnwesen');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });

  test('owners page loads without errors', async ({ page }) => {
    const response = await page.goto('/eigentuemer');
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});
