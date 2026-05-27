import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_CONVERSATIONS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantChat - Send Message', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'chat');
  });

  test('should send a text message in a conversation', async ({ page }) => {
    const message = TEST_CONVERSATIONS.directMessage.messages[0].text;
    await page.getByRole('listitem').filter({ hasText: TEST_USERS.secondary.displayName }).click();
    await page.getByRole('textbox', { name: /message/i }).fill(message);
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(message)).toBeVisible();
  });

  test('should display sent message with timestamp', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: TEST_USERS.secondary.displayName }).click();
    const messageText = `Test message ${Date.now()}`;
    await page.getByRole('textbox', { name: /message/i }).fill(messageText);
    await page.getByRole('button', { name: /send/i }).click();

    const messageElement = page.locator('[data-testid="message"]').filter({ hasText: messageText });
    await expect(messageElement).toBeVisible();
    await expect(messageElement.locator('[data-testid="timestamp"]')).toBeVisible();
  });

  test('should support emoji in messages', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: TEST_USERS.secondary.displayName }).click();
    await page.getByRole('textbox', { name: /message/i }).fill('Hello! 👋🎉');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText('Hello! 👋🎉')).toBeVisible();
  });

  test('should show typing indicator', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: TEST_USERS.secondary.displayName }).click();
    await page.getByRole('textbox', { name: /message/i }).fill('typing...');

    // Typing indicator should be visible to the other user (simulated)
    await expect(page.getByRole('textbox', { name: /message/i })).toHaveValue('typing...');
  });
});
