import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantTube - Comments', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'tube');
    await page.locator('[data-testid="video-card"]').first().click();
  });

  test('should display comments section', async ({ page }) => {
    await expect(page.locator('[data-testid="comments-section"]')).toBeVisible();
  });

  test('should post a comment on a video', async ({ page }) => {
    const comment = `E2E test comment ${Date.now()}`;
    await page.getByPlaceholder(/add a comment|write a comment/i).fill(comment);
    await page.getByRole('button', { name: /comment|post/i }).click();

    await expect(page.getByText(comment)).toBeVisible();
  });

  test('should reply to a comment', async ({ page }) => {
    const firstComment = page.locator('[data-testid="comment"]').first();
    await firstComment.getByRole('button', { name: /reply/i }).click();
    await page.getByPlaceholder(/write a reply/i).fill('This is a reply.');
    await page
      .getByRole('button', { name: /reply|post/i })
      .last()
      .click();

    await expect(page.getByText('This is a reply.')).toBeVisible();
  });

  test('should like a comment', async ({ page }) => {
    const firstComment = page.locator('[data-testid="comment"]').first();
    const likeButton = firstComment.getByRole('button', { name: /like/i });
    await likeButton.click();

    await expect(likeButton).toHaveAttribute('data-liked', 'true');
  });

  test('should delete own comment', async ({ page }) => {
    const comment = `Delete me ${Date.now()}`;
    await page.getByPlaceholder(/add a comment|write a comment/i).fill(comment);
    await page.getByRole('button', { name: /comment|post/i }).click();
    await expect(page.getByText(comment)).toBeVisible();

    const ownComment = page.locator('[data-testid="comment"]').filter({ hasText: comment });
    await ownComment.getByRole('button', { name: /more|menu/i }).click();
    await page.getByRole('menuitem', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(page.getByText(comment)).not.toBeVisible();
  });
});
