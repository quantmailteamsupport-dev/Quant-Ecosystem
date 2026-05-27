import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantNeon - Explore', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'neon');
  });

  test('should navigate to explore page', async ({ page }) => {
    await page.getByRole('link', { name: /explore|discover/i }).click();
    await expect(page.getByRole('heading', { name: /explore|discover/i })).toBeVisible();
  });

  test('should display trending topics', async ({ page }) => {
    await page.getByRole('link', { name: /explore|discover/i }).click();
    await expect(page.locator('[data-testid="trending-topics"]')).toBeVisible();
    await expect(page.locator('[data-testid="trending-item"]').first()).toBeVisible();
  });

  test('should search for users', async ({ page }) => {
    await page.getByRole('searchbox', { name: /search/i }).fill('testuser2');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="user-result"]')).toBeVisible();
  });

  test('should filter explore by content type', async ({ page }) => {
    await page.getByRole('link', { name: /explore|discover/i }).click();
    await page.getByRole('tab', { name: /photos/i }).click();
    await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible();

    await page.getByRole('tab', { name: /videos/i }).click();
    await expect(page.locator('[data-testid="post-card"]')).toBeVisible();
  });

  test('should click on trending topic and see related posts', async ({ page }) => {
    await page.getByRole('link', { name: /explore|discover/i }).click();
    await page.locator('[data-testid="trending-item"]').first().click();
    await expect(page.locator('[data-testid="post-card"]')).toBeVisible();
  });
});
