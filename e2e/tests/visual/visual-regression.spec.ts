import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should match login page screenshot', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('should match dashboard screenshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('should match mail inbox screenshot', async ({ page }) => {
    await navigateToApp(page, 'mail');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('mail-inbox.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('should match chat list screenshot', async ({ page }) => {
    await navigateToApp(page, 'chat');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('chat-list.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('should match AI chat screenshot', async ({ page }) => {
    await navigateToApp(page, 'ai');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('ai-chat.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('should match Tube feed screenshot', async ({ page }) => {
    await navigateToApp(page, 'tube');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tube-feed.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('should match Neon feed screenshot', async ({ page }) => {
    await navigateToApp(page, 'neon');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('neon-feed.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('should match responsive mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });
});
