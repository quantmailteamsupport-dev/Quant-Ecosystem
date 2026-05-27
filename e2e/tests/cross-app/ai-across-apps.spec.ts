import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Cross-App: AI Across Apps', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should use AI to compose email', async ({ page }) => {
    await navigateToApp(page, 'mail');
    await page.getByRole('button', { name: /compose/i }).click();
    await page.getByRole('button', { name: /ai.*compose|ai.*assist/i }).click();
    await page.getByPlaceholder(/describe|prompt/i).fill('Write a professional follow-up email');
    await page.getByRole('button', { name: /generate/i }).click();

    await expect(page.locator('[data-testid="email-body"]')).not.toBeEmpty();
  });

  test('should use AI to summarize chat', async ({ page }) => {
    await navigateToApp(page, 'chat');
    await page.locator('[data-testid="conversation"]').first().click();
    await page.getByRole('button', { name: /ai.*summarize|summarize/i }).click();

    await expect(page.locator('[data-testid="ai-summary"]')).toBeVisible();
  });

  test('should use AI assistant from any app via shortcut', async ({ page }) => {
    await navigateToApp(page, 'neon');
    await page.keyboard.press('Control+k');

    await expect(page.getByPlaceholder(/ask ai|search|command/i)).toBeVisible();
    await page.getByPlaceholder(/ask ai|search|command/i).fill('Help me create a post');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 15000 });
  });
});
