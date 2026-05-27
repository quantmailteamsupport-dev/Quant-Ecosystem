import { type Page, expect } from '@playwright/test';
import { TEST_USERS } from './test-data';

type UserKey = keyof typeof TEST_USERS;

export async function login(page: Page, userKey: UserKey = 'primary'): Promise<void> {
  const user = TEST_USERS[userKey];
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard**');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
}

export async function signup(
  page: Page,
  options?: { email?: string; password?: string; displayName?: string },
): Promise<void> {
  const email = options?.email ?? 'newuser@quant.test';
  const password = options?.password ?? 'NewUser123!';
  const displayName = options?.displayName ?? 'New User';

  await page.goto('/auth/signup');
  await page.getByLabel('Display Name').fill(displayName);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.waitForURL('**/onboarding**');
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /user menu|profile/i }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.waitForURL('**/auth/login**');
}

export async function getAuthToken(page: Page): Promise<string> {
  const storage = await page.context().storageState();
  const cookies = storage.cookies;
  const tokenCookie = cookies.find((c) => c.name === 'quant_session');
  return tokenCookie?.value ?? '';
}

export async function loginViaAPI(page: Page, userKey: UserKey = 'primary'): Promise<void> {
  const user = TEST_USERS[userKey];
  const response = await page.request.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  });
  expect(response.ok()).toBeTruthy();
}

export async function navigateToApp(
  page: Page,
  app: 'mail' | 'chat' | 'ai' | 'tube' | 'neon' | 'sync' | 'ads' | 'drive' | 'meet',
): Promise<void> {
  const appPaths: Record<string, string> = {
    mail: '/mail',
    chat: '/chat',
    ai: '/ai',
    tube: '/tube',
    neon: '/neon',
    sync: '/sync',
    ads: '/ads',
    drive: '/drive',
    meet: '/meet',
  };
  await page.goto(appPaths[app]);
  await page.waitForLoadState('networkidle');
}

export async function waitForToast(page: Page, message: string): Promise<void> {
  await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible({
    timeout: 10000,
  });
}
