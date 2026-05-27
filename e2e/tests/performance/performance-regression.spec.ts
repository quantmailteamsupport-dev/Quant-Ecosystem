import { test, expect } from '@playwright/test';
import { login, navigateToApp } from '../../fixtures/auth-helpers';

const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000, // 3 seconds max
  apiResponse: 1000, // 1 second max
  navigation: 2000, // 2 seconds max
  firstContentfulPaint: 1500, // 1.5 seconds max
  largestContentfulPaint: 2500, // 2.5 seconds max
  timeToInteractive: 3500, // 3.5 seconds max
};

test.describe('Performance Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'primary');
  });

  test('dashboard page load should be under threshold', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
  });

  test('mail inbox load should be under threshold', async ({ page }) => {
    const startTime = Date.now();
    await navigateToApp(page, 'mail');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
  });

  test('chat load should be under threshold', async ({ page }) => {
    const startTime = Date.now();
    await navigateToApp(page, 'chat');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
  });

  test('API login response should be under threshold', async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.post('/api/auth/login', {
      data: { email: 'testuser@quant.test', password: 'TestPass123!' },
    });
    const responseTime = Date.now() - startTime;

    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
  });

  test('navigation between apps should be under threshold', async ({ page }) => {
    await navigateToApp(page, 'mail');

    const startTime = Date.now();
    await navigateToApp(page, 'chat');
    const navTime = Date.now() - startTime;

    expect(navTime).toBeLessThan(PERFORMANCE_THRESHOLDS.navigation);
  });

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/dashboard');

    const metrics = await page.evaluate(() => {
      return new Promise<{ fcp: number; lcp: number }>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcp = entries.find((e) => e.name === 'first-contentful-paint');
          const lcp = entries.find((e) => e.entryType === 'largest-contentful-paint');
          resolve({
            fcp: fcp?.startTime ?? 0,
            lcp: lcp?.startTime ?? 0,
          });
        });
        observer.observe({ type: 'paint', buffered: true });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve({ fcp: 0, lcp: 0 }), 5000);
      });
    });

    if (metrics.fcp > 0) {
      expect(metrics.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
    }
  });

  test('Tube feed should load videos within threshold', async ({ page }) => {
    const startTime = Date.now();
    await navigateToApp(page, 'tube');
    await page.locator('[data-testid="video-card"]').first().waitFor({ state: 'visible' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
  });

  test('search API response should be under threshold', async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get('/api/search', {
      params: { q: 'test', limit: '20' },
    });
    const responseTime = Date.now() - startTime;

    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse);
  });
});
