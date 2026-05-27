import { test, expect } from '@playwright/test';
import { login } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Calendar to Meet', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should create a meeting from calendar event', async ({ page }) => {
    await page.goto('/calendar');
    await page.getByRole('button', { name: /new event|create/i }).click();
    await page.getByLabel('Title').fill('Team Standup');
    await page.getByRole('button', { name: /add video call|add meeting/i }).click();
    await page.getByRole('button', { name: /save|create/i }).click();

    await expect(page.getByText('Team Standup')).toBeVisible();
    await expect(page.getByText(/video call|meeting link/i)).toBeVisible();
  });

  test('should join meeting from calendar', async ({ page }) => {
    await page.goto('/calendar');
    await page.getByText('Team Standup').click();
    await page.getByRole('button', { name: /join|join meeting/i }).click();

    await expect(page).toHaveURL(/.*meet.*/);
    await expect(page.locator('[data-testid="meeting-room"]')).toBeVisible();
  });

  test('should show meeting participants from calendar invite', async ({ page }) => {
    await page.goto('/calendar');
    await page.getByText('Team Standup').click();

    await expect(page.locator('[data-testid="participants"]')).toBeVisible();
  });
});
