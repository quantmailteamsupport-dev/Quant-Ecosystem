import { test, expect } from '@playwright/test';
import { TEST_AI_SESSIONS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantAI - New Session', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'ai');
  });

  test('should start a new AI chat session', async ({ page }) => {
    await page.getByRole('button', { name: /new chat|new session/i }).click();
    await expect(page.getByPlaceholder(/ask anything|type a message/i)).toBeVisible();
  });

  test('should send a message and receive AI response', async ({ page }) => {
    await page.getByRole('button', { name: /new chat|new session/i }).click();
    const userMessage = TEST_AI_SESSIONS.basic.messages[0].content;
    await page.getByPlaceholder(/ask anything|type a message/i).fill(userMessage);
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(userMessage)).toBeVisible();
    // Wait for AI response with extended timeout
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 30000 });
  });

  test('should display session title based on conversation', async ({ page }) => {
    await page.getByRole('button', { name: /new chat|new session/i }).click();
    await page
      .getByPlaceholder(/ask anything|type a message/i)
      .fill('What is the capital of France?');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 30000 });
    // Session title should auto-generate
    await expect(page.locator('[data-testid="session-title"]')).not.toHaveText(
      /new chat|untitled/i,
    );
  });

  test('should support markdown rendering in responses', async ({ page }) => {
    await page.getByRole('button', { name: /new chat|new session/i }).click();
    await page
      .getByPlaceholder(/ask anything|type a message/i)
      .fill('Write a code example in Python');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.locator('[data-testid="ai-response"] code')).toBeVisible({ timeout: 30000 });
  });
});
