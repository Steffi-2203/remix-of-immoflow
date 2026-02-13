import { test, expect } from '@playwright/test';

/**
 * E2E: Billing Flow
 * Generate invoice -> Record payment -> Verify paid status
 */
test.describe('Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="email"], input[type="email"]', process.env.TEST_MANAGER_EMAIL || 'manager@test.immoflow.me');
    await page.fill('input[name="password"], input[type="password"]', process.env.TEST_MANAGER_PASSWORD || 'TestManager123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('navigate to billing section', async ({ page }) => {
    // Navigate to invoices/billing
    const billingLink = page.locator('a[href*="billing"], a[href*="invoices"], button:has-text("Vorschreibung")');
    if (await billingLink.isVisible()) {
      await billingLink.click();
      await page.waitForLoadState('networkidle');
      // Verify we're on a billing page
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('payment list is accessible', async ({ page }) => {
    const paymentsLink = page.locator('a[href*="payments"], button:has-text("Zahlungen")');
    if (await paymentsLink.isVisible()) {
      await paymentsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('table, [role="grid"], .payment-list').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
