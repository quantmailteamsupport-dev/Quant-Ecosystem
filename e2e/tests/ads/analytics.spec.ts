import { test, expect } from '@playwright/test';
import { TEST_CAMPAIGNS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantAds - Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'advertiser');
    await navigateToApp(page, 'ads');
  });

  test('should display analytics dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /analytics|dashboard/i }).click();
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible();
  });

  test('should show campaign performance metrics', async ({ page }) => {
    await page.getByText(TEST_CAMPAIGNS.basic.name).click();
    await page.getByRole('tab', { name: /analytics|performance/i }).click();

    await expect(page.getByText(/impressions/i)).toBeVisible();
    await expect(page.getByText(/clicks/i)).toBeVisible();
    await expect(page.getByText(/conversions/i)).toBeVisible();
    await expect(page.getByText(/spend/i)).toBeVisible();
  });

  test('should filter analytics by date range', async ({ page }) => {
    await page.getByRole('link', { name: /analytics|dashboard/i }).click();
    await page.getByRole('button', { name: /last 7 days|date range/i }).click();
    await page.getByRole('option', { name: /last 30 days/i }).click();

    await expect(page.locator('[data-testid="analytics-chart"]')).toBeVisible();
  });

  test('should export analytics report', async ({ page }) => {
    await page.getByRole('link', { name: /analytics|dashboard/i }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export|download/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/analytics.*\.(csv|xlsx|pdf)/);
  });
});
