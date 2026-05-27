import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Drive to Docs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should open a document from drive in editor', async ({ page }) => {
    await navigateToApp(page, 'drive');
    await page.locator('[data-testid="file-item"]').filter({ hasText: /\.doc/i }).first().click();

    await expect(page.locator('[data-testid="document-editor"]')).toBeVisible();
  });

  test('should create a new document from drive', async ({ page }) => {
    await navigateToApp(page, 'drive');
    await page.getByRole('button', { name: /new/i }).click();
    await page.getByRole('menuitem', { name: /document/i }).click();

    await expect(page.locator('[data-testid="document-editor"]')).toBeVisible();
  });

  test('should save document back to drive', async ({ page }) => {
    await navigateToApp(page, 'drive');
    await page.locator('[data-testid="file-item"]').filter({ hasText: /\.doc/i }).first().click();
    await page.locator('[data-testid="document-editor"]').fill('Updated content');
    await page.keyboard.press('Control+s');

    await expect(page.getByText(/saved/i)).toBeVisible();
  });
});
