import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Sync and Drive Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should access synced files from drive', async ({ page }) => {
    await navigateToApp(page, 'drive');
    await page.getByRole('link', { name: /synced|my files/i }).click();

    await expect(page.locator('[data-testid="file-item"]')).toBeVisible();
  });

  test('should upload file via drive and see in sync', async ({ page }) => {
    await navigateToApp(page, 'drive');
    await page.getByRole('button', { name: /upload/i }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'cross-app-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Cross-app file test'),
    });
    await expect(page.getByText('cross-app-test.txt')).toBeVisible();

    // Navigate to sync and verify
    await navigateToApp(page, 'sync');
    await expect(page.getByText('cross-app-test.txt')).toBeVisible();
  });

  test('should share drive file to chat', async ({ page }) => {
    await navigateToApp(page, 'drive');
    await page.locator('[data-testid="file-item"]').first().click({ button: 'right' });
    await page.getByRole('menuitem', { name: /share.*chat|send.*chat/i }).click();
    await page.getByPlaceholder(/search.*contact/i).fill('testuser2');
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: /send|share/i }).click();

    await expect(page.getByText(/shared|sent/i)).toBeVisible();
  });
});
