import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';
import path from 'path';

test.describe('QuantChat - File Sharing', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'chat');
    await page.getByRole('listitem').filter({ hasText: TEST_USERS.secondary.displayName }).click();
  });

  test('should upload and send a file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await page.getByRole('button', { name: /attach|upload/i }).click();
    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test file content for chat sharing'),
    });

    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText('test-document.txt')).toBeVisible();
  });

  test('should display file preview for images', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await page.getByRole('button', { name: /attach|upload/i }).click();

    // Create a minimal PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.locator('img[alt*="test-image"]')).toBeVisible();
  });

  test('should show file size information', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await page.getByRole('button', { name: /attach|upload/i }).click();
    await fileInput.setInputFiles({
      name: 'large-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(1024, 'a'),
    });

    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText(/large-file\.pdf/)).toBeVisible();
    await expect(page.getByText(/1\s*KB|1024/)).toBeVisible();
  });

  test('should allow downloading shared files', async ({ page }) => {
    await expect(page.getByText('test-document.txt')).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByRole('button', { name: /download/i })
        .first()
        .click(),
    ]);

    expect(download.suggestedFilename()).toBe('test-document.txt');
  });
});
