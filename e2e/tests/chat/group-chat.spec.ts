import { test, expect } from '@playwright/test';
import { TEST_USERS, TEST_CONVERSATIONS } from '../../fixtures/test-data';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

test.describe('QuantChat - Group Chat', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
    await navigateToApp(page, 'chat');
  });

  test('should create a new group chat', async ({ page }) => {
    await page.getByRole('button', { name: /new group|create group/i }).click();
    await page.getByLabel('Group Name').fill(TEST_CONVERSATIONS.groupChat.name);

    // Add participants
    await page.getByPlaceholder(/search|add member/i).fill(TEST_USERS.secondary.displayName);
    await page.getByRole('option', { name: TEST_USERS.secondary.displayName }).click();
    await page.getByPlaceholder(/search|add member/i).fill(TEST_USERS.admin.displayName);
    await page.getByRole('option', { name: TEST_USERS.admin.displayName }).click();

    await page.getByRole('button', { name: /create/i }).click();
    await expect(
      page.getByRole('heading', { name: TEST_CONVERSATIONS.groupChat.name }),
    ).toBeVisible();
  });

  test('should send message in group chat', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: TEST_CONVERSATIONS.groupChat.name }).click();
    const message = 'Hello group! This is a test message.';
    await page.getByRole('textbox', { name: /message/i }).fill(message);
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText(message)).toBeVisible();
  });

  test('should display group member list', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: TEST_CONVERSATIONS.groupChat.name }).click();
    await page.getByRole('button', { name: /members|info/i }).click();

    await expect(page.getByText(TEST_USERS.primary.displayName)).toBeVisible();
    await expect(page.getByText(TEST_USERS.secondary.displayName)).toBeVisible();
  });

  test('should allow leaving a group chat', async ({ page }) => {
    await page.getByRole('listitem').filter({ hasText: TEST_CONVERSATIONS.groupChat.name }).click();
    await page.getByRole('button', { name: /members|info/i }).click();
    await page.getByRole('button', { name: /leave group/i }).click();
    await page.getByRole('button', { name: /confirm/i }).click();

    await expect(
      page.getByRole('listitem').filter({ hasText: TEST_CONVERSATIONS.groupChat.name }),
    ).not.toBeVisible();
  });
});
