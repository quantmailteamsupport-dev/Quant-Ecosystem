import { test, expect } from '@playwright/test';
import { TEST_AI_SESSIONS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantAI - Tool Use', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'ai');
    await page.getByRole('button', { name: /new chat|new session/i }).click();
  });

  test('should trigger web search tool', async ({ page }) => {
    await page
      .getByPlaceholder(/ask anything|type a message/i)
      .fill('Search the web for latest TypeScript news');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(
      page.locator('[data-testid="tool-indicator"]').filter({ hasText: /search/i }),
    ).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 30000 });
  });

  test('should display tool execution status', async ({ page }) => {
    await page
      .getByPlaceholder(/ask anything|type a message/i)
      .fill('Summarize this webpage: https://example.com');
    await page.getByRole('button', { name: /send/i }).click();

    // Tool should show in-progress, then complete
    await expect(page.locator('[data-testid="tool-status"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 30000 });
  });

  test('should support multiple tools in one session', async ({ page }) => {
    await page
      .getByPlaceholder(/ask anything|type a message/i)
      .fill('Search for AI news and summarize the top results');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 30000 });
    // Should show at least one tool usage
    await expect(page.locator('[data-testid="tool-indicator"]').first()).toBeVisible();
  });

  test('should allow enabling and disabling tools', async ({ page }) => {
    await page.getByRole('button', { name: /tools|settings/i }).click();
    const toolToggle = page.getByRole('switch', { name: /web search/i });
    await expect(toolToggle).toBeVisible();
    await toolToggle.click();

    // Verify toggle state changed
    await expect(toolToggle).toHaveAttribute('aria-checked', 'false');
  });
});
