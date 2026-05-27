import { test, expect } from '@playwright/test';
import { TEST_FOLDERS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantMail - Folders', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'mail');
  });

  test('should display default mail folders', async ({ page }) => {
    await expect(page.getByRole('link', { name: /inbox/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sent/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /drafts/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /trash/i })).toBeVisible();
  });

  test('should create a custom folder', async ({ page }) => {
    await page.getByRole('button', { name: /new folder|create folder/i }).click();
    await page.getByLabel('Folder Name').fill(TEST_FOLDERS.custom.name);
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page.getByRole('link', { name: TEST_FOLDERS.custom.name })).toBeVisible();
  });

  test('should move email to a folder', async ({ page }) => {
    await page.getByRole('listitem').first().click();
    await page.getByRole('button', { name: /move to|move/i }).click();
    await page.getByRole('option', { name: TEST_FOLDERS.custom.name }).click();

    await expect(page.getByText(/moved to|moved successfully/i)).toBeVisible();
  });

  test('should navigate between folders', async ({ page }) => {
    await page.getByRole('link', { name: /sent/i }).click();
    await expect(page.getByRole('heading', { name: /sent/i })).toBeVisible();

    await page.getByRole('link', { name: /inbox/i }).click();
    await expect(page.getByRole('heading', { name: /inbox/i })).toBeVisible();
  });

  test('should delete a custom folder', async ({ page }) => {
    await page.getByRole('link', { name: TEST_FOLDERS.custom.name }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(page.getByRole('link', { name: TEST_FOLDERS.custom.name })).not.toBeVisible();
  });
});
