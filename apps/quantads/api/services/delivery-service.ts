// ============================================================================
// QuantAds - Delivery Service
// Ad delivery across all ecosystem apps
// ============================================================================

import type { Campaign, Creative, Placement, AppPlacement, BidRequest, UserAdProfile } from '../../src/types';
import { auctionService } from './auction-service';
import { targetingService } from './targeting-service';
import { analyticsService } from './analytics-service';

interface AdSlot {
  app: AppPlacement;
  position: string;
  format: string[];
  dimensions: { width: number; height: number };
  floorCPM: number;
}

interface DeliveredAd {
  campaignId: string;
  creativeId: string;
  creative: Creative;
  impressionId: string;
  trackingPixel: string;
  clickUrl: string;
  displayUrl: string;
}

interface FrequencyCap {
  campaignId: string;
  userId: string;
  impressionCount: number;
  lastShownAt: number;
}

class DeliveryService {
  private adSlots: Map<string, AdSlot[]> = new Map();
  private frequencyCaps: Map<string, FrequencyCap> = new Map();
  private deliveryLog: Map<string, number[]> = new Map(); // campaignId -> timestamps

  constructor() {
    this.initializeAdSlots();
  }

  // --------------------------------------------------------------------------
  // Ad Request Handling
  // --------------------------------------------------------------------------

  async requestAd(app: AppPlacement, position: string, userId: string, context?: Record<string, unknown>): Promise<DeliveredAd | null> {
    // 1. Find matching ad slot
    const slots = this.adSlots.get(app) || [];
    const slot = slots.find(s => s.position === position);
    if (!slot) return null;

    // 2. Get user profile for targeting
    const userProfile = targetingService.getUserProfile(userId);

    // 3. Check frequency caps
    const capKey = `${userId}_global`;
    const cap = this.frequencyCaps.get(capKey);
    if (cap && cap.impressionCount > 50 && Date.now() - cap.lastShownAt < 3600000) {
      return null; // Too many ads shown to this user recently
    }

    // 4. Create bid request
    const bidRequest: BidRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      impressionId: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      placement: {
        id: `slot_${app}_${position}`,
        app,
        position: position as any,
        format: slot.format as any[],
        dimensions: slot.dimensions,
        floor_cpm: slot.floorCPM,
        fillRate: 0.8,
      },
      userProfile,
      timestamp: Date.now(),
      floorPrice: slot.floorCPM,
    };

    // 5. Run auction
    const auctionResult = await auctionService.runAuction(bidRequest);
    if (!auctionResult) return null;

    // 6. Track impression
    const impressionId = analyticsService.trackImpression(
      auctionResult.winnerId,
      '', // creativeId - simplified
      userId,
      `${app}:${position}`,
      auctionResult.clearingPrice / 1000 // CPM to per-impression cost
    );

    // 7. Update frequency cap
    this.updateFrequencyCap(userId, auctionResult.winnerId);

    // 8. Build response
    const deliveredAd: DeliveredAd = {
      campaignId: auctionResult.winnerId,
      creativeId: '',
      creative: this.getPlaceholderCreative(slot),
      impressionId,
      trackingPixel: `https://ads.quant.app/track/impression/${impressionId}`,
      clickUrl: `https://ads.quant.app/track/click/${impressionId}`,
      displayUrl: 'https://advertiser.example.com',
    };

    // Log delivery
    const log = this.deliveryLog.get(auctionResult.winnerId) || [];
    log.push(Date.now());
    this.deliveryLog.set(auctionResult.winnerId, log.slice(-1000));

    return deliveredAd;
  }

  // --------------------------------------------------------------------------
  // Multi-App Ad Serving
  // --------------------------------------------------------------------------

  async getAdsForFeed(app: AppPlacement, userId: string, feedLength: number): Promise<{ position: number; ad: DeliveredAd }[]> {
    const ads: { position: number; ad: DeliveredAd }[] = [];
    const adFrequency = 5; // Show ad every 5 posts

    for (let i = adFrequency; i < feedLength; i += adFrequency) {
      const ad = await this.requestAd(app, 'feed', userId);
      if (ad) {
        ads.push({ position: i, ad });
      }
    }

    return ads;
  }

  async getPrerollAd(userId: string): Promise<DeliveredAd | null> {
    return this.requestAd('quantube', 'pre-roll', userId);
  }

  async getStoriesAd(app: AppPlacement, userId: string): Promise<DeliveredAd | null> {
    return this.requestAd(app, 'stories', userId);
  }

  // --------------------------------------------------------------------------
  // Frequency Capping
  // --------------------------------------------------------------------------

  private updateFrequencyCap(userId: string, campaignId: string): void {
    // Per-campaign cap
    const campaignKey = `${userId}_${campaignId}`;
    const campaignCap = this.frequencyCaps.get(campaignKey) || {
      campaignId,
      userId,
      impressionCount: 0,
      lastShownAt: 0,
    };
    campaignCap.impressionCount++;
    campaignCap.lastShownAt = Date.now();
    this.frequencyCaps.set(campaignKey, campaignCap);

    // Global cap
    const globalKey = `${userId}_global`;
    const globalCap = this.frequencyCaps.get(globalKey) || {
      campaignId: 'global',
      userId,
      impressionCount: 0,
      lastShownAt: 0,
    };
    globalCap.impressionCount++;
    globalCap.lastShownAt = Date.now();
    this.frequencyCaps.set(globalKey, globalCap);
  }

  checkFrequencyCap(userId: string, campaignId: string, maxImpressions: number, windowHours: number): boolean {
    const key = `${userId}_${campaignId}`;
    const cap = this.frequencyCaps.get(key);
    if (!cap) return true;
    if (Date.now() - cap.lastShownAt > windowHours * 3600000) return true;
    return cap.impressionCount < maxImpressions;
  }

  // --------------------------------------------------------------------------
  // Ad Slot Configuration
  // --------------------------------------------------------------------------

  private initializeAdSlots(): void {
    const allApps: AppPlacement[] = ['quantsync', 'quantchat', 'quantube', 'quantneon', 'quantmax', 'quantai', 'quantmail', 'quantedits'];

    for (const app of allApps) {
      const slots: AdSlot[] = [
        { app, position: 'feed', format: ['native', 'image', 'carousel'], dimensions: { width: 600, height: 400 }, floorCPM: 3.0 },
        { app, position: 'sidebar', format: ['image', 'text'], dimensions: { width: 300, height: 250 }, floorCPM: 1.5 },
        { app, position: 'banner', format: ['image'], dimensions: { width: 728, height: 90 }, floorCPM: 1.0 },
      ];

      if (app === 'quantube') {
        slots.push(
          { app, position: 'pre-roll', format: ['video'], dimensions: { width: 1920, height: 1080 }, floorCPM: 15.0 },
          { app, position: 'mid-roll', format: ['video'], dimensions: { width: 1920, height: 1080 }, floorCPM: 12.0 }
        );
      }

      if (['quantsync', 'quantneon', 'quantchat'].includes(app)) {
        slots.push({ app, position: 'stories', format: ['image', 'video'], dimensions: { width: 1080, height: 1920 }, floorCPM: 8.0 });
      }

      this.adSlots.set(app, slots);
    }
  }

  getAvailablePlacements(): { app: AppPlacement; slots: AdSlot[] }[] {
    return Array.from(this.adSlots.entries()).map(([app, slots]) => ({
      app: app as AppPlacement,
      slots,
    }));
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private getPlaceholderCreative(slot: AdSlot): Creative {
    return {
      id: `creative_placeholder`,
      campaignId: '',
      name: 'Ad Creative',
      format: slot.format[0] as any,
      headline: 'Sponsored Content',
      description: 'Advertisement',
      callToAction: 'Learn More',
      destinationUrl: 'https://advertiser.example.com',
      assets: [{
        id: 'asset_1',
        type: 'image',
        url: `https://ads.quant.app/creative/placeholder_${slot.dimensions.width}x${slot.dimensions.height}.png`,
        width: slot.dimensions.width,
        height: slot.dimensions.height,
        fileSize: 50000,
        mimeType: 'image/png',
      }],
      status: 'approved',
      performance: { impressions: 0, clicks: 0, ctr: 0, conversions: 0, spend: 0, qualityScore: 0.5 },
      createdAt: new Date().toISOString(),
    };
  }

  getDeliveryStats(campaignId: string): { totalDelivered: number; lastDeliveredAt: number | null; deliveryRate: number } {
    const log = this.deliveryLog.get(campaignId) || [];
    const lastHour = log.filter(t => Date.now() - t < 3600000);
    return {
      totalDelivered: log.length,
      lastDeliveredAt: log.length > 0 ? log[log.length - 1] : null,
      deliveryRate: lastHour.length, // impressions per hour
    };
  }
}

export const deliveryService = new DeliveryService();
export default DeliveryService;
