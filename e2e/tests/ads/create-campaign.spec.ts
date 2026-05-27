import { test, expect } from '@playwright/test';
import { TEST_CAMPAIGNS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantAds - Create Campaign', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'advertiser');
    await navigateToApp(page, 'ads');
  });

  test('should display campaign creation form', async ({ page }) => {
    await page.getByRole('button', { name: /new campaign|create campaign/i }).click();
    await expect(page.getByRole('heading', { name: /create campaign/i })).toBeVisible();
  });

  test('should create a campaign with basic settings', async ({ page }) => {
    await page.getByRole('button', { name: /new campaign|create campaign/i }).click();
    await page.getByLabel('Campaign Name').fill(TEST_CAMPAIGNS.basic.name);
    await page.getByLabel('Budget').fill(String(TEST_CAMPAIGNS.basic.budget));
    await page.getByLabel('Start Date').fill(TEST_CAMPAIGNS.basic.startDate);
    await page.getByLabel('End Date').fill(TEST_CAMPAIGNS.basic.endDate);
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Target audience step
    await page.getByLabel('Min Age').fill(String(TEST_CAMPAIGNS.basic.targetAudience.ageRange[0]));
    await page.getByLabel('Max Age').fill(String(TEST_CAMPAIGNS.basic.targetAudience.ageRange[1]));
    await page.getByRole('button', { name: /create|launch/i }).click();

    await expect(page.getByText(/campaign created|success/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /new campaign|create campaign/i }).click();
    await page.getByRole('button', { name: /next|continue/i }).click();

    await expect(page.getByText(/required|please fill/i)).toBeVisible();
  });

  test('should display campaign in list after creation', async ({ page }) => {
    await expect(page.getByText(TEST_CAMPAIGNS.basic.name)).toBeVisible();
    await expect(page.getByText(/active|pending/i).first()).toBeVisible();
  });
});
