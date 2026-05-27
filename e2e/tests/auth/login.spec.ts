import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display login form with required fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    const user = TEST_USERS.primary;
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.waitForURL('**/dashboard**');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(user.displayName)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('invalid@quant.test');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText(/invalid credentials|incorrect/i)).toBeVisible();
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should persist session across page reloads', async ({ page }) => {
    const user = TEST_USERS.primary;
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard**');

    await page.reload();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login.*/);
  });
});
