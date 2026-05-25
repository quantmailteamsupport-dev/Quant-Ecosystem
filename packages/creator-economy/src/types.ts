// ============================================================================
// Creator Economy - Type Definitions
// ============================================================================

// Creator Profile
export type CreatorLevel = 'starter' | 'rising' | 'established' | 'star' | 'legend';

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  level: CreatorLevel;
  totalEarnings: number;
  subscriberCount: number;
  contentCount: number;
  joinedAt: number;
  verifiedAt?: number;
  categories: string[];
  bio?: string;
  metadata: Record<string, string | number | boolean>;
}

// Revenue Model
export type RevenueModelType =
  | 'subscription'
  | 'tips'
  | 'marketplace'
  | 'ads'
  | 'sponsorship'
  | 'licensing';

export interface RevenueModel {
  id: string;
  creatorId: string;
  type: RevenueModelType;
  splitRatios: SplitRatios;
  minimumPayout: number;
  currency: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SplitRatios {
  platform: number;
  creator: number;
  referrer: number;
}

// Subscription Tiers
export type SubscriptionTierLevel = 'free' | 'basic' | 'premium' | 'vip';

export interface SubscriptionTier {
  id: string;
  creatorId: string;
  level: SubscriptionTierLevel;
  name: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  maxSubscribers?: number;
  trialDays: number;
  isActive: boolean;
  createdAt: number;
}

export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'paused';

export interface Subscription {
  id: string;
  userId: string;
  creatorId: string;
  tierId: string;
  status: SubscriptionStatus;
  startedAt: number;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  trialEndsAt?: number;
  cancelledAt?: number;
  retryCount: number;
  nextRetryAt?: number;
  metadata: Record<string, string | number | boolean>;
}

// Tip Transactions
export interface TipTransaction {
  id: string;
  senderId: string;
  receiverId: string;
  amount: number;
  currency: string;
  message?: string;
  contentId?: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
}

// Virtual Currency
export type VirtualCurrencyType = 'coins' | 'tokens' | 'gems' | 'stars';

export interface VirtualCurrency {
  type: VirtualCurrencyType;
  name: string;
  exchangeRate: number;
  baseCurrency: string;
  markup: number;
  minPurchase: number;
  maxPurchase: number;
  totalSupply: number;
  circulatingSupply: number;
}

export interface VirtualCurrencyBalance {
  userId: string;
  currencyType: VirtualCurrencyType;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastUpdated: number;
}

export interface LedgerEntry {
  id: string;
  timestamp: number;
  userId: string;
  currencyType: VirtualCurrencyType;
  amount: number;
  type: 'debit' | 'credit';
  category: 'tip' | 'purchase' | 'earning' | 'refund' | 'sink' | 'reward' | 'gift';
  referenceId: string;
  balance: number;
  description: string;
}

// Marketplace
export type ListingStatus = 'draft' | 'active' | 'sold' | 'delisted' | 'in_escrow' | 'disputed';

export type ListingCategory =
  | 'digital_art'
  | 'music'
  | 'video'
  | 'template'
  | 'course'
  | 'ebook'
  | 'preset'
  | 'other';

export interface MarketplaceListing {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  category: ListingCategory;
  status: ListingStatus;
  price: number;
  currency: string;
  pricingStrategy: PricingStrategy;
  images: string[];
  tags: string[];
  salesCount: number;
  rating: number;
  ratingCount: number;
  createdAt: number;
  updatedAt: number;
}

export type PricingStrategyType =
  | 'fixed'
  | 'auction_english'
  | 'auction_dutch'
  | 'pay_what_you_want';

export interface PricingStrategy {
  type: PricingStrategyType;
  basePrice: number;
  minimumPrice?: number;
  auctionConfig?: AuctionConfig;
}

export interface AuctionConfig {
  startPrice: number;
  reservePrice?: number;
  bidIncrement: number;
  startTime: number;
  endTime: number;
  extensionMinutes: number;
  maxBids?: number;
}

export interface AuctionBid {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  timestamp: number;
  isWinning: boolean;
  isAutoBid: boolean;
  maxAutoBid?: number;
}

// Creator Analytics
export interface CreatorAnalytics {
  creatorId: string;
  period: AnalyticsPeriod;
  totalEarnings: number;
  earningsDelta: number;
  subscriberCount: number;
  subscriberDelta: number;
  contentViews: number;
  viewsDelta: number;
  engagementRate: number;
  topContent: ContentPerformance[];
  demographics: AudienceDemographics;
  revenueBySource: Record<RevenueModelType, number>;
}

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export interface ContentPerformance {
  contentId: string;
  title: string;
  views: number;
  engagement: number;
  revenue: number;
  publishedAt: number;
}

export interface AudienceDemographics {
  ageGroups: Record<string, number>;
  locations: Record<string, number>;
  devices: Record<string, number>;
  referralSources: Record<string, number>;
}

// Payout Schedule
export type PayoutFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'held';

export interface PayoutSchedule {
  id: string;
  creatorId: string;
  frequency: PayoutFrequency;
  minimumAmount: number;
  currency: string;
  nextPayoutDate: number;
  lastPayoutDate?: number;
  paymentMethod: string;
  taxWithholdingRate: number;
  status: PayoutStatus;
}

export interface Payout {
  id: string;
  creatorId: string;
  amount: number;
  grossAmount: number;
  platformFee: number;
  taxWithholding: number;
  netAmount: number;
  currency: string;
  status: PayoutStatus;
  periodStart: number;
  periodEnd: number;
  processedAt?: number;
  transactionId?: string;
}

// Content License
export type LicenseType = 'personal' | 'commercial' | 'editorial' | 'exclusive' | 'open_source';

export interface ContentLicense {
  id: string;
  contentId: string;
  creatorId: string;
  type: LicenseType;
  terms: string;
  price: number;
  maxUses?: number;
  expiresAt?: number;
  territories: string[];
  isTransferable: boolean;
}

// Monetization Rules
export type MonetizationRuleType =
  | 'minimum_followers'
  | 'content_quality'
  | 'age_restriction'
  | 'category_restriction'
  | 'geo_restriction';

export interface MonetizationRule {
  id: string;
  type: MonetizationRuleType;
  condition: Record<string, string | number | boolean>;
  action: 'allow' | 'deny' | 'require_review';
  priority: number;
  isActive: boolean;
}

// Royalty Configuration
export interface RoyaltyConfig {
  id: string;
  contentId: string;
  originalCreatorId: string;
  royaltyPercentage: number;
  minimumRoyalty: number;
  maxRoyaltyPerSale: number;
  isCompounding: boolean;
  generations: number;
}

// Bundle Configuration
export interface BundleConfig {
  id: string;
  creatorId: string;
  name: string;
  listingIds: string[];
  discountPercentage: number;
  price: number;
  maxPurchases?: number;
  validFrom: number;
  validUntil?: number;
}

// Dispute Management
export type DisputeStatus =
  | 'opened'
  | 'under_review'
  | 'evidence_requested'
  | 'resolved_buyer'
  | 'resolved_seller'
  | 'escalated'
  | 'closed';

export type DisputeReason =
  | 'not_as_described'
  | 'not_delivered'
  | 'unauthorized'
  | 'quality_issue'
  | 'duplicate_charge'
  | 'other';

export interface DisputeCase {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  evidence: DisputeEvidence[];
  amount: number;
  resolution?: DisputeResolution;
  openedAt: number;
  resolvedAt?: number;
  escalatedAt?: number;
}

export interface DisputeEvidence {
  id: string;
  submittedBy: string;
  type: 'text' | 'image' | 'link' | 'document';
  content: string;
  submittedAt: number;
}

export interface DisputeResolution {
  type: 'full_refund' | 'partial_refund' | 'replacement' | 'no_action';
  amount?: number;
  resolvedBy: string;
  notes: string;
}

// Escrow
export type EscrowState = 'held' | 'released' | 'refunded' | 'disputed' | 'expired';

export interface EscrowTransaction {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  state: EscrowState;
  heldAt: number;
  releaseCondition: string;
  releasedAt?: number;
  expiresAt: number;
}

// Review Score
export interface ReviewScore {
  listingId: string;
  totalReviews: number;
  averageRating: number;
  wilsonScore: number;
  distribution: Record<number, number>;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export interface Review {
  id: string;
  listingId: string;
  reviewerId: string;
  rating: number;
  title?: string;
  body?: string;
  helpfulCount: number;
  verifiedPurchase: boolean;
  createdAt: number;
}

// Earnings Tracking
export interface EarningsPeriod {
  period: AnalyticsPeriod;
  startDate: number;
  endDate: number;
  grossEarnings: number;
  platformFees: number;
  taxes: number;
  netEarnings: number;
  transactionCount: number;
  sources: Record<RevenueModelType, number>;
}

// Exchange rates
export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updatedAt: number;
}

// Tax jurisdiction
export type TaxJurisdiction = 'US' | 'EU' | 'UK' | 'CA' | 'AU' | 'other';

export interface TaxConfig {
  jurisdiction: TaxJurisdiction;
  rate: number;
  threshold: number;
  filingRequired: boolean;
}
