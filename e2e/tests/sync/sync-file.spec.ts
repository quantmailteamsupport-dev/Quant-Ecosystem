import { test, expect } from '@playwright/test';
import { TEST_FILES } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantSync - File Sync', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'sync');
  });

  test('should display file list', async ({ page }) => {
    await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
  });

  test('should upload a file', async ({ page }) => {
    await page.getByRole('button', { name: /upload/i }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: TEST_FILES.document.name,
      mimeType: TEST_FILES.document.mimeType,
      buffer: Buffer.from(TEST_FILES.document.content),
    });

    await expect(page.getByText(TEST_FILES.document.name)).toBeVisible();
  });

  test('should show sync status indicator', async ({ page }) => {
    await expect(page.locator('[data-testid="sync-status"]')).toBeVisible();
    await expect(page.getByText(/synced|up to date/i)).toBeVisible();
  });

  test('should download a file', async ({ page }) => {
    const fileItem = page.locator('[data-testid="file-item"]').first();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      fileItem.getByRole('button', { name: /download/i }).click(),
    ]);

    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should delete a file', async ({ page }) => {
    const fileItem = page
      .locator('[data-testid="file-item"]')
      .filter({ hasText: TEST_FILES.document.name });
    await fileItem.getByRole('button', { name: /more|menu/i }).click();
    await page.getByRole('menuitem', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(fileItem).not.toBeVisible();
  });
});
