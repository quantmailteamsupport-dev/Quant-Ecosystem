// ============================================================================
// Marketplace - Listing Management with Auctions, Escrow, and Dispute Resolution
// ============================================================================

import type {
  MarketplaceListing,
  ListingStatus,
  ListingCategory,
  PricingStrategy,
  AuctionBid,
  EscrowTransaction,
  DisputeCase,
  DisputeStatus,
  DisputeReason,
  DisputeEvidence,
  ReviewScore,
  Review,
} from '../types.js';

interface ListingCreateInput {
  creatorId: string;
  title: string;
  description: string;
  category: ListingCategory;
  pricingStrategy: PricingStrategy;
  images: string[];
  tags: string[];
}

interface SearchFilters {
  category?: ListingCategory;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  tags?: string[];
  creatorId?: string;
  query?: string;
}

// Listing state machine transitions
const VALID_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ['active', 'delisted'],
  active: ['sold', 'delisted', 'in_escrow'],
  in_escrow: ['sold', 'disputed', 'active'],
  sold: [],
  delisted: ['draft', 'active'],
  disputed: ['in_escrow', 'sold', 'delisted'],
};

// Dispute state machine transitions
const DISPUTE_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  opened: ['under_review', 'closed'],
  under_review: ['evidence_requested', 'resolved_buyer', 'resolved_seller', 'escalated'],
  evidence_requested: ['under_review', 'escalated'],
  resolved_buyer: ['closed'],
  resolved_seller: ['closed'],
  escalated: ['resolved_buyer', 'resolved_seller', 'closed'],
  closed: [],
};

export class Marketplace {
  private listings: Map<string, MarketplaceListing> = new Map();
  private bids: Map<string, AuctionBid[]> = new Map();
  private escrows: Map<string, EscrowTransaction> = new Map();
  private disputes: Map<string, DisputeCase> = new Map();
  private reviews: Map<string, Review[]> = new Map();
  private reviewScores: Map<string, ReviewScore> = new Map();
  private nextListingId: number = 1;
  private nextBidId: number = 1;
  private nextEscrowId: number = 1;
  private nextDisputeId: number = 1;

  /**
   * Create a new marketplace listing in draft state.
   */
  createListing(input: ListingCreateInput): MarketplaceListing {
    const now = Date.now();
    const listing: MarketplaceListing = {
      id: `listing_${this.nextListingId++}`,
      creatorId: input.creatorId,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'draft',
      price: input.pricingStrategy.basePrice,
      currency: 'USD',
      pricingStrategy: input.pricingStrategy,
      images: input.images,
      tags: input.tags,
      salesCount: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.listings.set(listing.id, listing);
    return listing;
  }

  /**
   * Transition a listing to a new state using the state machine.
   */
  transitionListing(listingId: string, newStatus: ListingStatus): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    const validTargets = VALID_TRANSITIONS[listing.status];
    if (!validTargets || !validTargets.includes(newStatus)) {
      throw new Error(
        `Invalid transition from ${listing.status} to ${newStatus}. Valid: ${validTargets?.join(', ') ?? 'none'}`,
      );
    }

    listing.status = newStatus;
    listing.updatedAt = Date.now();
    this.listings.set(listingId, listing);
    return listing;
  }

  /**
   * Update a listing (only allowed in draft state).
   */
  updateListing(
    listingId: string,
    updates: Partial<
      Pick<MarketplaceListing, 'title' | 'description' | 'price' | 'images' | 'tags'>
    >,
  ): MarketplaceListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;
    if (listing.status !== 'draft' && listing.status !== 'active') {
      throw new Error('Can only update listings in draft or active state');
    }

    if (updates.title !== undefined) listing.title = updates.title;
    if (updates.description !== undefined) listing.description = updates.description;
    if (updates.price !== undefined) listing.price = updates.price;
    if (updates.images !== undefined) listing.images = updates.images;
    if (updates.tags !== undefined) listing.tags = updates.tags;
    listing.updatedAt = Date.now();

    this.listings.set(listingId, listing);
    return listing;
  }

  /**
   * Search listings with filters.
   */
  searchListings(filters: SearchFilters): MarketplaceListing[] {
    let results: MarketplaceListing[] = [];

    for (const [, listing] of this.listings) {
      if (listing.status !== 'active') continue;
      results.push(listing);
    }

    // Filter by category
    if (filters.category) {
      results = results.filter((l) => l.category === filters.category);
    }

    // Filter by price range
    if (filters.minPrice !== undefined) {
      results = results.filter((l) => l.price >= (filters.minPrice ?? 0));
    }
    if (filters.maxPrice !== undefined) {
      results = results.filter((l) => l.price <= (filters.maxPrice ?? Infinity));
    }

    // Filter by minimum rating
    if (filters.minRating !== undefined) {
      results = results.filter((l) => l.rating >= (filters.minRating ?? 0));
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((l) => filters.tags!.some((tag) => l.tags.includes(tag)));
    }

    // Filter by creator
    if (filters.creatorId) {
      results = results.filter((l) => l.creatorId === filters.creatorId);
    }

    // Filter by query (title/description search)
    if (filters.query) {
      const queryLower = filters.query.toLowerCase();
      results = results.filter(
        (l) =>
          l.title.toLowerCase().includes(queryLower) ||
          l.description.toLowerCase().includes(queryLower),
      );
    }

    return results;
  }

  /**
   * Place a bid on an auction listing.
   */
  placeBid(listingId: string, bidderId: string, amount: number): AuctionBid | null {
    const listing = this.listings.get(listingId);
    if (!listing || listing.status !== 'active') return null;
    if (listing.pricingStrategy.type !== 'auction_english') return null;

    const auctionConfig = listing.pricingStrategy.auctionConfig;
    if (!auctionConfig) return null;

    const now = Date.now();
    if (now > auctionConfig.endTime) return null;
    if (now < auctionConfig.startTime) return null;

    // Validate bid amount
    const existingBids = this.bids.get(listingId) ?? [];
    const highestBid =
      existingBids.length > 0
        ? Math.max(...existingBids.map((b) => b.amount))
        : auctionConfig.startPrice;

    const minimumBid = highestBid + auctionConfig.bidIncrement;
    if (amount < minimumBid) {
      throw new Error(
        `Bid must be at least ${minimumBid} (current high: ${highestBid} + increment: ${auctionConfig.bidIncrement})`,
      );
    }

    // Mark previous winning bid as not winning
    for (const bid of existingBids) {
      bid.isWinning = false;
    }

    const bid: AuctionBid = {
      id: `bid_${this.nextBidId++}`,
      listingId,
      bidderId,
      amount,
      timestamp: now,
      isWinning: true,
      isAutoBid: false,
    };

    existingBids.push(bid);
    this.bids.set(listingId, existingBids);

    // Extend auction if bid placed near end (snipe protection)
    const timeRemaining = auctionConfig.endTime - now;
    const extensionMs = auctionConfig.extensionMinutes * 60000;
    if (timeRemaining < extensionMs) {
      auctionConfig.endTime = now + extensionMs;
    }

    return bid;
  }

  /**
   * Get the current winning bid for an auction.
   */
  getWinningBid(listingId: string): AuctionBid | null {
    const bids = this.bids.get(listingId) ?? [];
    return bids.find((b) => b.isWinning) ?? null;
  }

  /**
   * Determine Dutch auction current price (price decreases over time).
   */
  getDutchAuctionPrice(listingId: string, currentTime: number): number | null {
    const listing = this.listings.get(listingId);
    if (!listing || listing.pricingStrategy.type !== 'auction_dutch') return null;

    const auctionConfig = listing.pricingStrategy.auctionConfig;
    if (!auctionConfig) return null;

    const duration = auctionConfig.endTime - auctionConfig.startTime;
    const elapsed = currentTime - auctionConfig.startTime;

    if (elapsed < 0) return auctionConfig.startPrice;
    if (elapsed >= duration) return auctionConfig.reservePrice ?? 0;

    // Linear price decrease
    const priceRange = auctionConfig.startPrice - (auctionConfig.reservePrice ?? 0);
    const priceDecrease = priceRange * (elapsed / duration);
    return Math.round((auctionConfig.startPrice - priceDecrease) * 100) / 100;
  }

  /**
   * Create an escrow transaction for a purchase.
   */
  createEscrow(
    listingId: string,
    buyerId: string,
    amount: number,
    currency: string,
  ): EscrowTransaction | null {
    const listing = this.listings.get(listingId);
    if (!listing || listing.status !== 'active') return null;

    const now = Date.now();
    const escrow: EscrowTransaction = {
      id: `escrow_${this.nextEscrowId++}`,
      listingId,
      buyerId,
      sellerId: listing.creatorId,
      amount,
      currency,
      state: 'held',
      heldAt: now,
      releaseCondition: 'delivery_confirmed',
      expiresAt: now + 14 * 86400000, // 14 day expiry
    };

    this.escrows.set(escrow.id, escrow);

    // Transition listing to in_escrow
    this.transitionListing(listingId, 'in_escrow');

    return escrow;
  }

  /**
   * Release escrow funds to the seller (delivery confirmed).
   */
  releaseEscrow(escrowId: string): EscrowTransaction | null {
    const escrow = this.escrows.get(escrowId);
    if (!escrow || escrow.state !== 'held') return null;

    escrow.state = 'released';
    escrow.releasedAt = Date.now();
    this.escrows.set(escrowId, escrow);

    // Transition listing to sold
    const listing = this.listings.get(escrow.listingId);
    if (listing && listing.status === 'in_escrow') {
      listing.status = 'sold';
      listing.salesCount += 1;
      listing.updatedAt = Date.now();
      this.listings.set(listing.id, listing);
    }

    return escrow;
  }

  /**
   * Refund escrow to the buyer.
   */
  refundEscrow(escrowId: string): EscrowTransaction | null {
    const escrow = this.escrows.get(escrowId);
    if (!escrow || escrow.state !== 'held') return null;

    escrow.state = 'refunded';
    this.escrows.set(escrowId, escrow);

    // Return listing to active
    const listing = this.listings.get(escrow.listingId);
    if (listing && listing.status === 'in_escrow') {
      listing.status = 'active';
      listing.updatedAt = Date.now();
      this.listings.set(listing.id, listing);
    }

    return escrow;
  }

  /**
   * Submit a review for a listing.
   */
  submitReview(
    listingId: string,
    reviewerId: string,
    rating: number,
    title?: string,
    body?: string,
  ): Review {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const review: Review = {
      id: `review_${listingId}_${reviewerId}_${Date.now()}`,
      listingId,
      reviewerId,
      rating,
      title,
      body,
      helpfulCount: 0,
      verifiedPurchase: true,
      createdAt: Date.now(),
    };

    const listingReviews = this.reviews.get(listingId) ?? [];
    listingReviews.push(review);
    this.reviews.set(listingId, listingReviews);

    // Recalculate Wilson score
    this.recalculateRatingScore(listingId);

    return review;
  }

  /**
   * Calculate Wilson score lower bound for review rating aggregation.
   * Formula: (p + z^2/(2n) - z*sqrt(p*(1-p)/n + z^2/(4n^2))) / (1 + z^2/n)
   * where p = positive proportion, n = total reviews, z = 1.96 (95% CI)
   */
  calculateWilsonScore(positive: number, total: number): number {
    if (total === 0) return 0;

    const z = 1.96; // 95% confidence
    const p = positive / total;
    const z2 = z * z;
    const n = total;

    const numerator = p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
    const denominator = 1 + z2 / n;

    return Math.max(0, numerator / denominator);
  }

  /**
   * Recalculate the aggregate rating score for a listing using Wilson score.
   */
  private recalculateRatingScore(listingId: string): void {
    const listingReviews = this.reviews.get(listingId) ?? [];
    if (listingReviews.length === 0) return;

    const total = listingReviews.length;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const review of listingReviews) {
      sum += review.rating;
      distribution[review.rating] = (distribution[review.rating] ?? 0) + 1;
    }

    const average = sum / total;

    // For Wilson score, treat ratings 4-5 as "positive"
    const positive = (distribution[4] ?? 0) + (distribution[5] ?? 0);
    const wilsonScore = this.calculateWilsonScore(positive, total);

    // Determine trend from last 10 reviews vs previous
    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (listingReviews.length >= 10) {
      const sorted = [...listingReviews].sort((a, b) => b.createdAt - a.createdAt);
      const recent = sorted.slice(0, 5);
      const older = sorted.slice(5, 10);

      const recentAvg = recent.reduce((s, r) => s + r.rating, 0) / recent.length;
      const olderAvg = older.reduce((s, r) => s + r.rating, 0) / older.length;

      if (recentAvg - olderAvg > 0.3) recentTrend = 'improving';
      else if (olderAvg - recentAvg > 0.3) recentTrend = 'declining';
    }

    const score: ReviewScore = {
      listingId,
      totalReviews: total,
      averageRating: Math.round(average * 100) / 100,
      wilsonScore: Math.round(wilsonScore * 10000) / 10000,
      distribution,
      recentTrend,
    };

    this.reviewScores.set(listingId, score);

    // Update listing rating
    const listing = this.listings.get(listingId);
    if (listing) {
      listing.rating = score.averageRating;
      listing.ratingCount = total;
      this.listings.set(listingId, listing);
    }
  }

  /**
   * Get the review score for a listing.
   */
  getReviewScore(listingId: string): ReviewScore | undefined {
    return this.reviewScores.get(listingId);
  }

  /**
   * Open a dispute for a transaction.
   */
  openDispute(
    listingId: string,
    buyerId: string,
    reason: DisputeReason,
    description: string,
  ): DisputeCase | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    // Find related escrow
    let relatedEscrow: EscrowTransaction | undefined;
    for (const [, escrow] of this.escrows) {
      if (escrow.listingId === listingId && escrow.buyerId === buyerId) {
        relatedEscrow = escrow;
        break;
      }
    }

    const now = Date.now();
    const dispute: DisputeCase = {
      id: `dispute_${this.nextDisputeId++}`,
      listingId,
      buyerId,
      sellerId: listing.creatorId,
      reason,
      description,
      status: 'opened',
      evidence: [],
      amount: relatedEscrow?.amount ?? listing.price,
      openedAt: now,
    };

    this.disputes.set(dispute.id, dispute);

    // Update escrow state if exists
    if (relatedEscrow) {
      relatedEscrow.state = 'disputed';
      this.escrows.set(relatedEscrow.id, relatedEscrow);
    }

    // Transition listing to disputed
    if (listing.status === 'in_escrow') {
      listing.status = 'disputed';
      listing.updatedAt = now;
      this.listings.set(listing.id, listing);
    }

    return dispute;
  }

  /**
   * Transition a dispute to a new state.
   */
  transitionDispute(disputeId: string, newStatus: DisputeStatus): DisputeCase | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;

    const validTargets = DISPUTE_TRANSITIONS[dispute.status];
    if (!validTargets || !validTargets.includes(newStatus)) {
      throw new Error(
        `Invalid dispute transition from ${dispute.status} to ${newStatus}. Valid: ${validTargets?.join(', ') ?? 'none'}`,
      );
    }

    dispute.status = newStatus;

    if (newStatus === 'escalated') {
      dispute.escalatedAt = Date.now();
    }

    if (
      newStatus === 'resolved_buyer' ||
      newStatus === 'resolved_seller' ||
      newStatus === 'closed'
    ) {
      dispute.resolvedAt = Date.now();
    }

    this.disputes.set(disputeId, dispute);
    return dispute;
  }

  /**
   * Submit evidence for a dispute.
   */
  submitEvidence(
    disputeId: string,
    submittedBy: string,
    type: DisputeEvidence['type'],
    content: string,
  ): DisputeEvidence | null {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return null;

    if (
      dispute.status === 'closed' ||
      dispute.status === 'resolved_buyer' ||
      dispute.status === 'resolved_seller'
    ) {
      return null;
    }

    const evidence: DisputeEvidence = {
      id: `evidence_${disputeId}_${Date.now()}`,
      submittedBy,
      type,
      content,
      submittedAt: Date.now(),
    };

    dispute.evidence.push(evidence);
    this.disputes.set(disputeId, dispute);
    return evidence;
  }

  /**
   * Get a listing by ID.
   */
  getListing(listingId: string): MarketplaceListing | undefined {
    return this.listings.get(listingId);
  }

  /**
   * Get all bids for a listing.
   */
  getListingBids(listingId: string): AuctionBid[] {
    return this.bids.get(listingId) ?? [];
  }

  /**
   * Get dispute by ID.
   */
  getDispute(disputeId: string): DisputeCase | undefined {
    return this.disputes.get(disputeId);
  }

  /**
   * Get escrow by ID.
   */
  getEscrow(escrowId: string): EscrowTransaction | undefined {
    return this.escrows.get(escrowId);
  }

  /**
   * Get all listings by a creator.
   */
  getCreatorListings(creatorId: string): MarketplaceListing[] {
    const result: MarketplaceListing[] = [];
    for (const [, listing] of this.listings) {
      if (listing.creatorId === creatorId) {
        result.push(listing);
      }
    }
    return result;
  }

  /**
   * Handle pay-what-you-want pricing with minimum.
   */
  validatePayWhatYouWant(listingId: string, offeredAmount: number): boolean {
    const listing = this.listings.get(listingId);
    if (!listing) return false;
    if (listing.pricingStrategy.type !== 'pay_what_you_want') return false;

    const minimum = listing.pricingStrategy.minimumPrice ?? 0;
    return offeredAmount >= minimum;
  }
}
