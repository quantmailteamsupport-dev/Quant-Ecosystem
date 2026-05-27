import { test, expect } from '@playwright/test';
import { TEST_POSTS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantNeon - Create Post', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'neon');
  });

  test('should create a text post', async ({ page }) => {
    await page.getByRole('button', { name: /new post|create/i }).click();
    await page
      .getByPlaceholder(/what's on your mind|write something/i)
      .fill(TEST_POSTS.text.content);
    await page.getByRole('button', { name: /post|publish/i }).click();

    await expect(page.getByText(TEST_POSTS.text.content)).toBeVisible();
  });

  test('should create a post with image', async ({ page }) => {
    await page.getByRole('button', { name: /new post|create/i }).click();
    await page
      .getByPlaceholder(/what's on your mind|write something/i)
      .fill(TEST_POSTS.withMedia.content);

    const fileInput = page.locator('input[type="file"]');
    await page.getByRole('button', { name: /photo|image|media/i }).click();
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    await fileInput.setInputFiles({
      name: 'post-image.png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    });

    await page.getByRole('button', { name: /post|publish/i }).click();
    await expect(page.getByText(TEST_POSTS.withMedia.content)).toBeVisible();
  });

  test('should set post visibility', async ({ page }) => {
    await page.getByRole('button', { name: /new post|create/i }).click();
    await page.getByPlaceholder(/what's on your mind|write something/i).fill('Private post');
    await page.getByRole('button', { name: /public|visibility/i }).click();
    await page.getByRole('option', { name: /friends only|private/i }).click();
    await page.getByRole('button', { name: /post|publish/i }).click();

    await expect(page.getByText('Private post')).toBeVisible();
  });

  test('should add hashtags to post', async ({ page }) => {
    await page.getByRole('button', { name: /new post|create/i }).click();
    await page.getByPlaceholder(/what's on your mind|write something/i).fill('Testing #quant #e2e');
    await page.getByRole('button', { name: /post|publish/i }).click();

    await expect(page.getByText('#quant')).toBeVisible();
    await expect(page.getByText('#e2e')).toBeVisible();
  });
});
