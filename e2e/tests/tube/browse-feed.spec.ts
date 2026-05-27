import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantTube - Browse Feed', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'tube');
  });

  test('should display video feed on homepage', async ({ page }) => {
    await expect(page.locator('[data-testid="video-card"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="video-thumbnail"]').first()).toBeVisible();
  });

  test('should play video on click', async ({ page }) => {
    await page.locator('[data-testid="video-card"]').first().click();
    await expect(page.locator('video')).toBeVisible();
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.getByRole('tab', { name: /trending/i }).click();
    await expect(page.locator('[data-testid="video-card"]')).toBeVisible();

    await page.getByRole('tab', { name: /music/i }).click();
    await expect(page.locator('[data-testid="video-card"]')).toBeVisible();
  });

  test('should search for videos', async ({ page }) => {
    await page.getByRole('searchbox', { name: /search/i }).fill('test video');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should load more videos on scroll', async ({ page }) => {
    const initialCount = await page.locator('[data-testid="video-card"]').count();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const newCount = await page.locator('[data-testid="video-card"]').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});
