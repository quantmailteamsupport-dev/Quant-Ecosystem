import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Mail to Chat', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should start a chat from an email sender', async ({ page }) => {
    await navigateToApp(page, 'mail');
    await page.getByRole('listitem').first().click();
    await page.getByRole('button', { name: /chat with sender|message/i }).click();

    await expect(page).toHaveURL(/.*chat.*/);
    await expect(page.getByRole('textbox', { name: /message/i })).toBeVisible();
  });

  test('should share email content to chat', async ({ page }) => {
    await navigateToApp(page, 'mail');
    await page.getByRole('listitem').first().click();
    await page.getByRole('button', { name: /share|forward to chat/i }).click();
    await page.getByPlaceholder(/search.*contact|select.*recipient/i).fill('testuser2');
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: /send|share/i }).click();

    await expect(page.getByText(/shared|sent to chat/i)).toBeVisible();
  });

  test('should receive chat notification about email', async ({ page }) => {
    await navigateToApp(page, 'chat');
    await expect(page.locator('[data-testid="notification-badge"]')).toBeVisible();
  });
});
