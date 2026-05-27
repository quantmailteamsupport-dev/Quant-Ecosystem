import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Neon to Tube', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should share a Tube video to Neon feed', async ({ page }) => {
    await navigateToApp(page, 'tube');
    await page.locator('[data-testid="video-card"]').first().click();
    await page.getByRole('button', { name: /share/i }).click();
    await page.getByRole('button', { name: /share to neon|post to neon/i }).click();

    await expect(page.getByText(/shared to neon|posted/i)).toBeVisible();
  });

  test('should embed Tube video in Neon post', async ({ page }) => {
    await navigateToApp(page, 'neon');
    await page.getByRole('button', { name: /new post|create/i }).click();
    await page.getByRole('button', { name: /embed|video/i }).click();
    await page.getByPlaceholder(/paste.*url|search.*video/i).fill('test video');
    await page.locator('[data-testid="video-result"]').first().click();

    await expect(page.locator('[data-testid="embedded-video"]')).toBeVisible();
  });

  test('should navigate from Neon video post to Tube', async ({ page }) => {
    await navigateToApp(page, 'neon');
    const videoPost = page
      .locator('[data-testid="post-card"]')
      .filter({ has: page.locator('video, [data-testid="video-embed"]') })
      .first();
    await videoPost.getByRole('link', { name: /watch on tube|view on tube/i }).click();

    await expect(page).toHaveURL(/.*tube.*/);
  });
});
