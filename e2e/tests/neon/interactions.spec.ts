import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantNeon - Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'neon');
  });

  test('should like a post', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const likeButton = firstPost.getByRole('button', { name: /like/i });
    await likeButton.click();

    await expect(likeButton).toHaveAttribute('data-liked', 'true');
  });

  test('should comment on a post', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.getByRole('button', { name: /comment/i }).click();
    const comment = `Test comment ${Date.now()}`;
    await page.getByPlaceholder(/write a comment/i).fill(comment);
    await page
      .getByRole('button', { name: /post|send/i })
      .last()
      .click();

    await expect(page.getByText(comment)).toBeVisible();
  });

  test('should share a post', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.getByRole('button', { name: /share|repost/i }).click();
    await page.getByRole('button', { name: /share to feed|repost/i }).click();

    await expect(page.getByText(/shared|reposted/i)).toBeVisible();
  });

  test('should follow a user from post', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const followButton = firstPost.getByRole('button', { name: /follow/i });
    await followButton.click();

    await expect(firstPost.getByRole('button', { name: /following/i })).toBeVisible();
  });

  test('should bookmark a post', async ({ page }) => {
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.getByRole('button', { name: /bookmark|save/i }).click();

    await expect(page.getByText(/saved|bookmarked/i)).toBeVisible();
  });
});
