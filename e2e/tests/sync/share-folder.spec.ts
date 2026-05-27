import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantSync - Share Folder', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'sync');
  });

  test('should create a new folder', async ({ page }) => {
    await page.getByRole('button', { name: /new folder|create folder/i }).click();
    await page.getByLabel('Folder Name').fill('Shared Workspace');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page.getByText('Shared Workspace')).toBeVisible();
  });

  test('should share a folder with another user', async ({ page }) => {
    const folder = page
      .locator('[data-testid="folder-item"]')
      .filter({ hasText: 'Shared Workspace' });
    await folder.getByRole('button', { name: /share/i }).click();

    await page.getByPlaceholder(/email|user/i).fill(TEST_USERS.secondary.email);
    await page.getByRole('button', { name: /add|invite/i }).click();
    await expect(page.getByText(TEST_USERS.secondary.email)).toBeVisible();
    await page.getByRole('button', { name: /done|save/i }).click();

    await expect(page.getByText(/shared/i)).toBeVisible();
  });

  test('should set permission level for shared folder', async ({ page }) => {
    const folder = page
      .locator('[data-testid="folder-item"]')
      .filter({ hasText: 'Shared Workspace' });
    await folder.getByRole('button', { name: /share/i }).click();

    const userRow = page
      .locator('[data-testid="share-member"]')
      .filter({ hasText: TEST_USERS.secondary.email });
    await userRow.getByRole('combobox', { name: /permission/i }).selectOption('editor');
    await page.getByRole('button', { name: /done|save/i }).click();

    await expect(page.getByText(/updated|saved/i)).toBeVisible();
  });

  test('should revoke folder access', async ({ page }) => {
    const folder = page
      .locator('[data-testid="folder-item"]')
      .filter({ hasText: 'Shared Workspace' });
    await folder.getByRole('button', { name: /share/i }).click();

    const userRow = page
      .locator('[data-testid="share-member"]')
      .filter({ hasText: TEST_USERS.secondary.email });
    await userRow.getByRole('button', { name: /remove/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(userRow).not.toBeVisible();
  });
});
