import { test, expect } from '@playwright/test';

test.describe('OAuth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display SSO login options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible();
  });

  test('should initiate Google OAuth flow and redirect to provider', async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /continue with google/i }).click(),
    ]);

    await expect(popup).toHaveURL(/accounts\.google\.com|oauth/);
  });

  test('should initiate GitHub OAuth flow and redirect to provider', async ({ page }) => {
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /continue with github/i }).click(),
    ]);

    await expect(popup).toHaveURL(/github\.com\/login\/oauth|oauth/);
  });

  test('should support SSO across Quant apps after login', async ({ page }) => {
    const { TEST_USERS } = await import('../../fixtures/test-data');
    const user = TEST_USERS.primary;
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard**');

    // Navigate to QuantMail - should not require re-login
    await page.goto('/mail');
    await expect(page).not.toHaveURL(/.*login.*/);
    await expect(page.getByRole('heading', { name: /inbox|mail/i })).toBeVisible();

    // Navigate to QuantChat - should not require re-login
    await page.goto('/chat');
    await expect(page).not.toHaveURL(/.*login.*/);
    await expect(page.getByRole('heading', { name: /chat|messages/i })).toBeVisible();
  });

  test('should handle OAuth callback errors gracefully', async ({ page }) => {
    await page.goto('/auth/callback?error=access_denied&error_description=User+denied+access');
    await expect(page.getByText(/access denied|authentication failed/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /try again|back to login/i })).toBeVisible();
  });
});
