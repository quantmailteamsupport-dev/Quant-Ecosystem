import { test, expect } from '@playwright/test';
import { TEST_EMAILS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantMail - Compose and Send', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'mail');
  });

  test('should compose and send a new email', async ({ page }) => {
    await page.getByRole('button', { name: /compose/i }).click();
    await page.getByLabel('To').fill(TEST_EMAILS.basic.to);
    await page.getByLabel('Subject').fill(TEST_EMAILS.basic.subject);
    await page.locator('[data-testid="email-body"]').fill(TEST_EMAILS.basic.body);
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(/sent successfully|message sent/i)).toBeVisible();
  });

  test('should save email as draft', async ({ page }) => {
    await page.getByRole('button', { name: /compose/i }).click();
    await page.getByLabel('To').fill(TEST_EMAILS.basic.to);
    await page.getByLabel('Subject').fill('Draft Email');
    await page.locator('[data-testid="email-body"]').fill('This is a draft.');
    await page.getByRole('button', { name: /save draft|close/i }).click();

    await page.getByRole('link', { name: /drafts/i }).click();
    await expect(page.getByText('Draft Email')).toBeVisible();
  });

  test('should send email with CC and BCC', async ({ page }) => {
    await page.getByRole('button', { name: /compose/i }).click();
    await page.getByRole('button', { name: /cc.*bcc|show cc/i }).click();
    await page.getByLabel('To').fill(TEST_EMAILS.basic.to);
    await page.getByLabel('CC').fill('cc-user@quant.test');
    await page.getByLabel('BCC').fill('bcc-user@quant.test');
    await page.getByLabel('Subject').fill('CC/BCC Test');
    await page.locator('[data-testid="email-body"]').fill('Testing CC and BCC.');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(/sent successfully|message sent/i)).toBeVisible();
  });

  test('should reply to an email', async ({ page }) => {
    await page.getByRole('listitem').first().click();
    await page.getByRole('button', { name: /reply/i }).click();
    await page.locator('[data-testid="email-body"]').fill('Thanks for your email!');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(/sent successfully|message sent/i)).toBeVisible();
  });
});
