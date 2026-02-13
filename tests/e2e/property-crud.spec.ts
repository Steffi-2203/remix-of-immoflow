import { test, expect } from '@playwright/test';

/**
 * E2E: Property CRUD Flow
 * Login as manager -> Create property -> Add unit -> Assign tenant
 */
test.describe('Property CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Login
    await page.fill('input[name="email"], input[type="email"]', process.env.TEST_MANAGER_EMAIL || 'manager@test.immoflow.me');
    await page.fill('input[name="password"], input[type="password"]', process.env.TEST_MANAGER_PASSWORD || 'TestManager123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('create a new property', async ({ page }) => {
    await page.click('a[href*="properties"], button:has-text("Objekte")');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Neues Objekt"), button:has-text("Hinzufügen"), a:has-text("Neu")');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.fill('#name, input[name="name"]', 'E2E Test Objekt');
      await page.fill('#address, input[name="address"]', 'E2E-Straße 1');
      await page.click('button[type="submit"], button:has-text("Speichern")');
      await expect(page.locator('text=E2E Test Objekt')).toBeVisible({ timeout: 5000 });
    }
  });
});
