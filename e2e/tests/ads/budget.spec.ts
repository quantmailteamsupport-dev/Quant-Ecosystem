import { test, expect } from '@playwright/test';
import { TEST_CAMPAIGNS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantAds - Budget Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'advertiser');
    await navigateToApp(page, 'ads');
    await page.getByText(TEST_CAMPAIGNS.basic.name).click();
  });

  test('should display current budget allocation', async ({ page }) => {
    await page.getByRole('tab', { name: /budget/i }).click();
    await expect(page.getByText(/budget/i)).toBeVisible();
    await expect(page.getByText(`$${TEST_CAMPAIGNS.basic.budget}`)).toBeVisible();
  });

  test('should update campaign budget', async ({ page }) => {
    await page.getByRole('tab', { name: /budget/i }).click();
    await page.getByRole('button', { name: /edit budget|adjust/i }).click();
    await page.getByLabel('Daily Budget').clear();
    await page.getByLabel('Daily Budget').fill('50');
    await page.getByRole('button', { name: /save|update/i }).click();

    await expect(page.getByText(/updated|saved/i)).toBeVisible();
  });

  test('should show budget spend tracker', async ({ page }) => {
    await page.getByRole('tab', { name: /budget/i }).click();
    await expect(page.locator('[data-testid="spend-tracker"]')).toBeVisible();
    await expect(page.getByText(/spent/i)).toBeVisible();
    await expect(page.getByText(/remaining/i)).toBeVisible();
  });

  test('should set budget alerts', async ({ page }) => {
    await page.getByRole('tab', { name: /budget/i }).click();
    await page.getByRole('button', { name: /alerts|notifications/i }).click();
    await page.getByLabel('Alert at % spent').fill('80');
    await page.getByRole('button', { name: /save|set alert/i }).click();

    await expect(page.getByText(/alert.*set|notification.*enabled/i)).toBeVisible();
  });
});
