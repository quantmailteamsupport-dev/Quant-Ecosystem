import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantMail - Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'mail');
  });

  test('should search emails by subject', async ({ page }) => {
    await page.getByRole('searchbox', { name: /search/i }).fill('Test Email Subject');
    await page.keyboard.press('Enter');

    await expect(page.getByText('Test Email Subject')).toBeVisible();
  });

  test('should search emails by sender', async ({ page }) => {
    await page.getByRole('searchbox', { name: /search/i }).fill('from:testuser2@quant.test');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should show no results for unmatched query', async ({ page }) => {
    await page.getByRole('searchbox', { name: /search/i }).fill('xyznonexistent12345');
    await page.keyboard.press('Enter');

    await expect(page.getByText(/no results|no emails found/i)).toBeVisible();
  });

  test('should support advanced search filters', async ({ page }) => {
    await page.getByRole('button', { name: /advanced search|filters/i }).click();
    await page.getByLabel('From').fill('testuser2@quant.test');
    await page.getByLabel('Has Attachment').check();
    await page.getByRole('button', { name: /search|apply/i }).click();

    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });
});
