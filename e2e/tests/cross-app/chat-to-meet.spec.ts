import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Chat to Meet', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'chat');
  });

  test('should start a video call from chat', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: TEST_USERS.secondary.displayName }).click();
    await page.getByRole('button', { name: /video call|call/i }).click();

    await expect(page).toHaveURL(/.*meet.*/);
    await expect(page.locator('[data-testid="meeting-room"]')).toBeVisible();
  });

  test('should start a group call from group chat', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: /group/i }).first().click();
    await page.getByRole('button', { name: /video call|call/i }).click();

    await expect(page).toHaveURL(/.*meet.*/);
    await expect(page.locator('[data-testid="meeting-room"]')).toBeVisible();
  });

  test('should share meeting link in chat', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: TEST_USERS.secondary.displayName }).click();
    await page.getByRole('button', { name: /attach|plus/i }).click();
    await page.getByRole('menuitem', { name: /meeting link|schedule meet/i }).click();

    await expect(page.getByText(/meet.*link|meeting.*scheduled/i)).toBeVisible();
  });
});
