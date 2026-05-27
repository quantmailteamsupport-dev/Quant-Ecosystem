import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantAI - Chat History', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'ai');
  });

  test('should display previous chat sessions in sidebar', async ({ page }) => {
    await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-item"]').first()).toBeVisible();
  });

  test('should load a previous session and display messages', async ({ page }) => {
    await page.locator('[data-testid="session-item"]').first().click();
    await expect(page.locator('[data-testid="message"]').first()).toBeVisible();
  });

  test('should continue a previous conversation', async ({ page }) => {
    await page.locator('[data-testid="session-item"]').first().click();
    await page.getByPlaceholder(/ask anything|type a message/i).fill('Follow up question');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText('Follow up question')).toBeVisible();
    await expect(page.locator('[data-testid="ai-response"]').last()).toBeVisible({
      timeout: 30000,
    });
  });

  test('should delete a chat session', async ({ page }) => {
    const firstSession = page.locator('[data-testid="session-item"]').first();
    const sessionText = await firstSession.textContent();
    await firstSession.hover();
    await firstSession.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    if (sessionText) {
      await expect(page.getByText(sessionText)).not.toBeVisible();
    }
  });

  test('should search through chat history', async ({ page }) => {
    await page.getByPlaceholder(/search.*sessions|search.*history/i).fill('capital');
    await expect(page.locator('[data-testid="session-item"]')).toBeVisible();
  });
});
