import { test, expect } from '@playwright/test';
import { login } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Universal Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should open universal search with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder(/search everywhere|search/i)).toBeVisible();
  });

  test('should search across mail, chat, and files', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder(/search everywhere|search/i).fill('test');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    await expect(page.getByRole('tab', { name: /all/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /mail/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /chat/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /files/i })).toBeVisible();
  });

  test('should filter search results by app', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder(/search everywhere|search/i).fill('test');
    await page.keyboard.press('Enter');
    await page.getByRole('tab', { name: /mail/i }).click();

    const results = page.locator('[data-testid="search-result-item"]');
    await expect(results.first()).toBeVisible();
  });

  test('should navigate to result from search', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder(/search everywhere|search/i).fill('test');
    await page.keyboard.press('Enter');
    await page.locator('[data-testid="search-result-item"]').first().click();

    // Should navigate away from search
    await expect(page.getByPlaceholder(/search everywhere|search/i)).not.toBeVisible();
  });
});
