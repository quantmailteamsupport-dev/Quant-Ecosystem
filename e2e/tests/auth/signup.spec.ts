import { test, expect } from '@playwright/test';

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  test('should display signup form with all required fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel('Display Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('should create account and redirect to onboarding', async ({ page }) => {
    const uniqueEmail = `signup-test-${Date.now()}@quant.test`;
    await page.getByLabel('Display Name').fill('New Test User');
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('SecurePass123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await page.waitForURL('**/onboarding**');
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should show validation errors for weak password', async ({ page }) => {
    await page.getByLabel('Display Name').fill('Weak Password User');
    await page.getByLabel('Email').fill('weak@quant.test');
    await page.getByLabel('Password', { exact: true }).fill('123');
    await page.getByLabel('Confirm Password').fill('123');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText(/password.*requirements|too short|at least/i)).toBeVisible();
  });

  test('should show error for existing email', async ({ page }) => {
    await page.getByLabel('Display Name').fill('Duplicate User');
    await page.getByLabel('Email').fill('testuser@quant.test');
    await page.getByLabel('Password', { exact: true }).fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('SecurePass123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText(/already exists|already registered/i)).toBeVisible();
  });

  test('should navigate to login from signup page', async ({ page }) => {
    await page.getByRole('link', { name: /sign in|already have an account/i }).click();
    await expect(page).toHaveURL(/.*login.*/);
  });
});
