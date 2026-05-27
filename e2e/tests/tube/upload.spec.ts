import { test, expect } from '@playwright/test';
import { TEST_VIDEOS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantTube - Upload', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'tube');
  });

  test('should open upload dialog', async ({ page }) => {
    await page.getByRole('button', { name: /upload/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/drag.*drop|select.*file/i)).toBeVisible();
  });

  test('should upload a video with metadata', async ({ page }) => {
    await page.getByRole('button', { name: /upload/i }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: TEST_VIDEOS.upload.fileName,
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(1024, 0),
    });

    await page.getByLabel('Title').fill(TEST_VIDEOS.upload.title);
    await page.getByLabel('Description').fill(TEST_VIDEOS.upload.description);
    for (const tag of TEST_VIDEOS.upload.tags) {
      await page.getByPlaceholder(/add tag/i).fill(tag);
      await page.keyboard.press('Enter');
    }

    await page.getByRole('button', { name: /publish|upload/i }).click();
    await expect(page.getByText(/uploaded|processing/i)).toBeVisible({ timeout: 30000 });
  });

  test('should show upload progress', async ({ page }) => {
    await page.getByRole('button', { name: /upload/i }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-video.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(10240, 0),
    });

    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
  });

  test('should validate file type on upload', async ({ page }) => {
    await page.getByRole('button', { name: /upload/i }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.alloc(100, 0),
    });

    await expect(page.getByText(/unsupported|invalid file/i)).toBeVisible();
  });
});
