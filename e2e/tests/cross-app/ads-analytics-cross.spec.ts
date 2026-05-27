import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Ads Analytics Cross-Platform', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'advertiser');
  });

  test('should show ad performance across Neon and Tube', async ({ page }) => {
    await navigateToApp(page, 'ads');
    await page.getByRole('link', { name: /analytics|dashboard/i }).click();
    await page.getByRole('tab', { name: /platform breakdown|by platform/i }).click();

    await expect(page.getByText(/neon/i)).toBeVisible();
    await expect(page.getByText(/tube/i)).toBeVisible();
  });

  test('should drill into Neon ad placement from ads dashboard', async ({ page }) => {
    await navigateToApp(page, 'ads');
    await page.getByRole('link', { name: /analytics|dashboard/i }).click();
    await page.getByRole('link', { name: /neon.*details|view neon/i }).click();

    await expect(page.getByText(/neon.*performance|neon.*metrics/i)).toBeVisible();
  });

  test('should view ad preview on target platform', async ({ page }) => {
    await navigateToApp(page, 'ads');
    await page.locator('[data-testid="campaign-item"]').first().click();
    await page.getByRole('button', { name: /preview/i }).click();
    await page.getByRole('tab', { name: /neon feed/i }).click();

    await expect(page.locator('[data-testid="ad-preview"]')).toBeVisible();
  });
});
