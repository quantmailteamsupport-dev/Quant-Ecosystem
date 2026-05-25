// ============================================================================
// Quant Developer Platform - App Marketplace
// ============================================================================

import {
  MarketplaceApp,
  AppSubmission,
  AppReview,
  AppCategory,
  AppRating,
  AppStatus,
  InstallRecord,
  RevenueShare,
  SubmissionChecklist,
} from '../types';

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ============================================================================
// Revenue Share Constants
// ============================================================================

const DEVELOPER_SHARE_PERCENTAGE = 70;
const PLATFORM_SHARE_PERCENTAGE = 30;

// ============================================================================
// App Marketplace Class
// ============================================================================

export class AppMarketplace {
  private apps: Map<string, MarketplaceApp> = new Map();
  private submissions: Map<string, AppSubmission> = new Map();
  private reviews: Map<string, AppReview> = new Map();
  private installs: Map<string, InstallRecord[]> = new Map(); // appId -> installs
  private ratings: Map<string, Array<{ userId: string; stars: number; review: string; timestamp: number }>> = new Map();
  private revenue: Map<string, number> = new Map(); // appId -> total revenue

  /**
   * Submit a new app to the marketplace
   */
  public submitApp(params: {
    name: string;
    description: string;
    longDescription: string;
    developerId: string;
    category: AppCategory;
    tags?: string[];
    version: string;
    iconUrl: string;
    screenshotUrls?: string[];
    websiteUrl: string;
    supportUrl: string;
    privacyPolicyUrl: string;
    pricing: MarketplaceApp['pricing'];
  }): { app: MarketplaceApp; submission: AppSubmission } {
    const now = Date.now();

    const app: MarketplaceApp = {
      id: generateId(),
      name: params.name,
      slug: slugify(params.name),
      description: params.description,
      longDescription: params.longDescription,
      developerId: params.developerId,
      category: params.category,
      tags: params.tags || [],
      version: params.version,
      iconUrl: params.iconUrl,
      screenshotUrls: params.screenshotUrls || [],
      websiteUrl: params.websiteUrl,
      supportUrl: params.supportUrl,
      privacyPolicyUrl: params.privacyPolicyUrl,
      pricing: params.pricing,
      status: 'submitted',
      rating: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      installCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };

    this.apps.set(app.id, app);
    this.installs.set(app.id, []);
    this.ratings.set(app.id, []);
    this.revenue.set(app.id, 0);

    // Create submission
    const checklist: SubmissionChecklist = {
      hasDescription: params.description.length > 10,
      hasScreenshots: (params.screenshotUrls || []).length > 0,
      hasPrivacyPolicy: params.privacyPolicyUrl.length > 0,
      hasSupportUrl: params.supportUrl.length > 0,
      passesSecurityScan: true, // Simulated
      meetsPerformanceThreshold: true, // Simulated
    };

    const submission: AppSubmission = {
      id: generateId(),
      appId: app.id,
      version: params.version,
      submittedAt: now,
      reviewNotes: '',
      checklist,
      status: 'pending',
    };

    this.submissions.set(submission.id, submission);
    return { app, submission };
  }

  /**
   * Review an app submission (admin action)
   */
  public reviewApp(submissionId: string, params: {
    reviewerId: string;
    decision: 'approved' | 'rejected' | 'changes_requested';
    feedback: string;
    securityNotes?: string;
    performanceNotes?: string;
  }): AppReview | null {
    const submission = this.submissions.get(submissionId);
    if (!submission) return null;

    const review: AppReview = {
      id: generateId(),
      submissionId,
      reviewerId: params.reviewerId,
      decision: params.decision,
      feedback: params.feedback,
      reviewedAt: Date.now(),
      securityNotes: params.securityNotes,
      performanceNotes: params.performanceNotes,
    };

    this.reviews.set(review.id, review);

    // Update submission status
    submission.status = params.decision === 'approved' ? 'approved' : params.decision === 'rejected' ? 'rejected' : 'pending';
    this.submissions.set(submissionId, submission);

    // Update app status
    const app = this.apps.get(submission.appId);
    if (app) {
      if (params.decision === 'approved') {
        app.status = 'approved';
        app.publishedAt = Date.now();
        app.updatedAt = Date.now();
      } else if (params.decision === 'rejected') {
        app.status = 'rejected';
        app.updatedAt = Date.now();
      }
      this.apps.set(app.id, app);
    }

    return review;
  }

  /**
   * Publish an approved app to the marketplace
   */
  public publishApp(appId: string): boolean {
    const app = this.apps.get(appId);
    if (!app || app.status !== 'approved') return false;

    app.status = 'published';
    app.publishedAt = Date.now();
    app.updatedAt = Date.now();
    this.apps.set(appId, app);
    return true;
  }

  /**
   * List apps with filtering, searching, and sorting
   */
  public listApps(params?: {
    category?: AppCategory;
    search?: string;
    status?: AppStatus;
    sortBy?: 'rating' | 'installs' | 'newest' | 'name';
    developerId?: string;
    offset?: number;
    limit?: number;
  }): { apps: MarketplaceApp[]; total: number; offset: number; limit: number } {
    let results = Array.from(this.apps.values());

    // Filter by status (default to published for public listing)
    if (params?.status) {
      results = results.filter(a => a.status === params.status);
    } else if (!params?.developerId) {
      results = results.filter(a => a.status === 'published');
    }

    if (params?.category) {
      results = results.filter(a => a.category === params.category);
    }

    if (params?.developerId) {
      results = results.filter(a => a.developerId === params.developerId);
    }

    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(searchLower) ||
        a.description.toLowerCase().includes(searchLower) ||
        a.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    const sortBy = params?.sortBy || 'newest';
    switch (sortBy) {
      case 'rating':
        results.sort((a, b) => b.rating.average - a.rating.average);
        break;
      case 'installs':
        results.sort((a, b) => b.installCount - a.installCount);
        break;
      case 'newest':
        results.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    const total = results.length;
    const offset = params?.offset || 0;
    const limit = params?.limit || 20;
    results = results.slice(offset, offset + limit);

    return { apps: results, total, offset, limit };
  }

  /**
   * Install an app for a user
   */
  public installApp(appId: string, userId: string): InstallRecord | null {
    const app = this.apps.get(appId);
    if (!app || app.status !== 'published') return null;

    // Check if already installed
    const appInstalls = this.installs.get(appId) || [];
    const existing = appInstalls.find(i => i.userId === userId && !i.uninstalledAt);
    if (existing) return existing;

    const install: InstallRecord = {
      id: generateId(),
      appId,
      userId,
      installedAt: Date.now(),
      uninstalledAt: null,
      version: app.version,
    };

    appInstalls.push(install);
    this.installs.set(appId, appInstalls);

    // Increment install counter
    app.installCount++;
    this.apps.set(appId, app);

    // Record revenue if paid app
    if (app.pricing.model !== 'free' && app.pricing.price > 0) {
      const currentRevenue = this.revenue.get(appId) || 0;
      this.revenue.set(appId, currentRevenue + app.pricing.price);
    }

    return install;
  }

  /**
   * Uninstall an app with optional reason tracking
   */
  public uninstallApp(appId: string, userId: string, reason?: string): boolean {
    const appInstalls = this.installs.get(appId) || [];
    const install = appInstalls.find(i => i.userId === userId && !i.uninstalledAt);
    if (!install) return false;

    install.uninstalledAt = Date.now();
    install.uninstallReason = reason;
    this.installs.set(appId, appInstalls);

    // Decrement active install counter
    const app = this.apps.get(appId);
    if (app && app.installCount > 0) {
      app.installCount--;
      this.apps.set(appId, app);
    }

    return true;
  }

  /**
   * Rate an app (1-5 stars with review text)
   */
  public rateApp(appId: string, userId: string, stars: number, reviewText: string): boolean {
    const app = this.apps.get(appId);
    if (!app) return false;
    if (stars < 1 || stars > 5) return false;

    const appRatings = this.ratings.get(appId) || [];

    // Check if user already rated - update their rating
    const existingIndex = appRatings.findIndex(r => r.userId === userId);
    if (existingIndex >= 0) {
      appRatings[existingIndex] = { userId, stars, review: reviewText, timestamp: Date.now() };
    } else {
      appRatings.push({ userId, stars, review: reviewText, timestamp: Date.now() });
    }

    this.ratings.set(appId, appRatings);

    // Recalculate rating
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const rating of appRatings) {
      distribution[rating.stars]++;
      sum += rating.stars;
    }

    app.rating = {
      average: appRatings.length > 0 ? sum / appRatings.length : 0,
      count: appRatings.length,
      distribution,
    };

    this.apps.set(appId, app);
    return true;
  }

  /**
   * Get app statistics including installs, ratings, revenue, retention
   */
  public getAppStats(appId: string): {
    installs: { total: number; active: number; uninstalled: number };
    rating: AppRating;
    revenue: { total: number; developerShare: number; platformShare: number };
    retention: { day1: number; day7: number; day30: number };
    uninstallReasons: Record<string, number>;
  } | null {
    const app = this.apps.get(appId);
    if (!app) return null;

    const appInstalls = this.installs.get(appId) || [];
    const active = appInstalls.filter(i => !i.uninstalledAt).length;
    const uninstalled = appInstalls.filter(i => i.uninstalledAt).length;

    const totalRevenue = this.revenue.get(appId) || 0;

    // Calculate retention (simplified)
    const now = Date.now();
    const day1Installs = appInstalls.filter(i => now - i.installedAt >= 86400000);
    const day1Retained = day1Installs.filter(i => !i.uninstalledAt || (i.uninstalledAt - i.installedAt) > 86400000);

    const day7Installs = appInstalls.filter(i => now - i.installedAt >= 604800000);
    const day7Retained = day7Installs.filter(i => !i.uninstalledAt || (i.uninstalledAt - i.installedAt) > 604800000);

    const day30Installs = appInstalls.filter(i => now - i.installedAt >= 2592000000);
    const day30Retained = day30Installs.filter(i => !i.uninstalledAt || (i.uninstalledAt - i.installedAt) > 2592000000);

    // Uninstall reasons
    const reasons: Record<string, number> = {};
    for (const install of appInstalls.filter(i => i.uninstalledAt && i.uninstallReason)) {
      reasons[install.uninstallReason!] = (reasons[install.uninstallReason!] || 0) + 1;
    }

    return {
      installs: { total: appInstalls.length, active, uninstalled },
      rating: app.rating,
      revenue: {
        total: totalRevenue,
        developerShare: totalRevenue * (DEVELOPER_SHARE_PERCENTAGE / 100),
        platformShare: totalRevenue * (PLATFORM_SHARE_PERCENTAGE / 100),
      },
      retention: {
        day1: day1Installs.length > 0 ? day1Retained.length / day1Installs.length : 0,
        day7: day7Installs.length > 0 ? day7Retained.length / day7Installs.length : 0,
        day30: day30Installs.length > 0 ? day30Retained.length / day30Installs.length : 0,
      },
      uninstallReasons: reasons,
    };
  }

  /**
   * Calculate revenue share (70% developer, 30% platform)
   */
  public calculateRevenueShare(appId: string, period?: string): RevenueShare | null {
    const app = this.apps.get(appId);
    if (!app) return null;

    const totalRevenue = this.revenue.get(appId) || 0;
    const developerShare = totalRevenue * (DEVELOPER_SHARE_PERCENTAGE / 100);
    const platformShare = totalRevenue * (PLATFORM_SHARE_PERCENTAGE / 100);

    return {
      appId,
      developerId: app.developerId,
      totalRevenue,
      developerShare,
      platformShare,
      developerPercentage: DEVELOPER_SHARE_PERCENTAGE,
      platformPercentage: PLATFORM_SHARE_PERCENTAGE,
      period: period || 'all-time',
      payoutStatus: 'pending',
    };
  }

  /**
   * Get a specific app by ID
   */
  public getApp(appId: string): MarketplaceApp | null {
    return this.apps.get(appId) || null;
  }

  /**
   * Suspend an app (admin action)
   */
  public suspendApp(appId: string): boolean {
    const app = this.apps.get(appId);
    if (!app) return false;

    app.status = 'suspended';
    app.updatedAt = Date.now();
    this.apps.set(appId, app);
    return true;
  }

  /**
   * Get categories with app counts
   */
  public getCategories(): Array<{ category: AppCategory; count: number }> {
    const categoryCounts = new Map<AppCategory, number>();
    for (const app of this.apps.values()) {
      if (app.status === 'published') {
        categoryCounts.set(app.category, (categoryCounts.get(app.category) || 0) + 1);
      }
    }
    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }
}
