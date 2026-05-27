import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('Cross-App: Workflow Chain', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('should complete full workflow: receive mail, discuss in chat, schedule meeting', async ({
    page,
  }) => {
    // Step 1: Check mail
    await navigateToApp(page, 'mail');
    await page.getByRole('listitem').first().click();
    await expect(page.locator('[data-testid="email-content"]')).toBeVisible();

    // Step 2: Forward to chat for discussion
    await page.getByRole('button', { name: /share|forward to chat/i }).click();
    await page.getByPlaceholder(/search.*contact|select.*recipient/i).fill('testuser2');
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: /send|share/i }).click();

    // Step 3: Navigate to chat
    await navigateToApp(page, 'chat');
    await expect(page.locator('[data-testid="conversation"]')).toBeVisible();
  });

  test('should complete content creation workflow: AI draft, post to Neon, share to Tube', async ({
    page,
  }) => {
    // Step 1: Use AI to generate content
    await navigateToApp(page, 'ai');
    await page.getByRole('button', { name: /new chat|new session/i }).click();
    await page
      .getByPlaceholder(/ask anything|type a message/i)
      .fill('Write a social media post about technology');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 30000 });

    // Step 2: Copy and navigate to Neon
    await page
      .locator('[data-testid="ai-response"]')
      .last()
      .getByRole('button', { name: /copy/i })
      .click();
    await navigateToApp(page, 'neon');
    await expect(page.getByRole('button', { name: /new post|create/i })).toBeVisible();
  });

  test('should complete file collaboration workflow: upload, share, edit', async ({ page }) => {
    // Step 1: Upload to sync
    await navigateToApp(page, 'sync');
    await page.getByRole('button', { name: /upload/i }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'workflow-doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Collaborative document'),
    });
    await expect(page.getByText('workflow-doc.txt')).toBeVisible();

    // Step 2: Share with team
    await page
      .locator('[data-testid="file-item"]')
      .filter({ hasText: 'workflow-doc.txt' })
      .getByRole('button', { name: /share/i })
      .click();
    await expect(page.locator('[data-testid="share-dialog"]')).toBeVisible();
  });
});
