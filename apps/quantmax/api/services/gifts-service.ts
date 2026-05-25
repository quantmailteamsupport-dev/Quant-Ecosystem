// ============================================================================
// QuantMax - Gifts Service
// Virtual gifts with catalog, purchase with diamond balance check, top-up,
// gift delivery, animation triggers, revenue split (creator 70%), top gifter
// tracking, lifetime leaderboard
// ============================================================================

interface GiftCatalogItem {
  id: string;
  name: string;
  icon: string;
  priceInDiamonds: number;
  animation: 'float' | 'explode' | 'rain' | 'spin' | 'grow' | 'pulse';
  category: 'basic' | 'premium' | 'luxury' | 'legendary';
  rarity: number; // 1-5
}

interface DiamondBalance {
  userId: string;
  balance: number;
  lifetimePurchased: number;
  lifetimeSpent: number;
  lastTopUp: number | null;
}

interface DiamondPackage {
  id: string;
  diamonds: number;
  priceUSD: number;
  bonusDiamonds: number;
  label: string;
  popular: boolean;
}

interface GiftTransaction {
  id: string;
  senderId: string;
  recipientId: string;
  streamId: string;
  giftId: string;
  giftName: string;
  diamondCost: number;
  comboCount: number;
  timestamp: number;
  animationTriggered: boolean;
}

interface GiftAnimationEvent {
  transactionId: string;
  giftId: string;
  animation: string;
  comboLevel: number;
  senderName: string;
  streamId: string;
  timestamp: number;
}

interface StreamGifterEntry {
  userId: string;
  displayName: string;
  avatarUrl: string;
  totalDiamonds: number;
  giftCount: number;
  lastGiftAt: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string;
  totalDiamondsGifted: number;
  uniqueCreatorsSupported: number;
}

interface CreatorRevenue {
  creatorId: string;
  totalDiamondsReceived: number;
  revenueShare: number; // 70%
  pendingPayout: number;
  lifetimePayout: number;
}

// Constants
const CREATOR_REVENUE_SHARE = 0.7; // Creator gets 70%
const DIAMOND_TO_USD = 0.01; // 1 diamond = $0.01

const GIFT_CATALOG: GiftCatalogItem[] = [
  { id: 'rose', name: 'Rose', icon: '🌹', priceInDiamonds: 1, animation: 'float', category: 'basic', rarity: 1 },
  { id: 'heart', name: 'Heart', icon: '❤️', priceInDiamonds: 5, animation: 'pulse', category: 'basic', rarity: 1 },
  { id: 'rocket', name: 'Rocket', icon: '🚀', priceInDiamonds: 50, animation: 'explode', category: 'premium', rarity: 2 },
  { id: 'diamond', name: 'Diamond', icon: '💎', priceInDiamonds: 100, animation: 'spin', category: 'premium', rarity: 3 },
  { id: 'castle', name: 'Castle', icon: '🏰', priceInDiamonds: 500, animation: 'grow', category: 'luxury', rarity: 4 },
  { id: 'universe', name: 'Universe', icon: '🌌', priceInDiamonds: 1000, animation: 'rain', category: 'legendary', rarity: 5 },
  { id: 'crown', name: 'Crown', icon: '👑', priceInDiamonds: 2000, animation: 'explode', category: 'legendary', rarity: 5 },
  { id: 'planet', name: 'Planet', icon: '🪐', priceInDiamonds: 5000, animation: 'rain', category: 'legendary', rarity: 5 },
];

const DIAMOND_PACKAGES: DiamondPackage[] = [
  { id: 'pkg_100', diamonds: 100, priceUSD: 1, bonusDiamonds: 0, label: 'Starter', popular: false },
  { id: 'pkg_500', diamonds: 500, priceUSD: 4, bonusDiamonds: 25, label: 'Plus', popular: false },
  { id: 'pkg_1000', diamonds: 1000, priceUSD: 7, bonusDiamonds: 75, label: 'Pro', popular: true },
  { id: 'pkg_5000', diamonds: 5000, priceUSD: 30, bonusDiamonds: 500, label: 'Ultra', popular: false },
  { id: 'pkg_10000', diamonds: 10000, priceUSD: 55, bonusDiamonds: 1500, label: 'Mega', popular: false },
];

class GiftsService {
  private balances: Map<string, DiamondBalance> = new Map();
  private transactions: GiftTransaction[] = [];
  private animationEvents: GiftAnimationEvent[] = [];
  private streamGifters: Map<string, StreamGifterEntry[]> = new Map();
  private creatorRevenue: Map<string, CreatorRevenue> = new Map();

  // Get gift catalog
  getCatalog(category?: string): GiftCatalogItem[] {
    if (category) {
      return GIFT_CATALOG.filter(g => g.category === category);
    }
    return [...GIFT_CATALOG];
  }

  // Get diamond packages
  getPackages(): DiamondPackage[] {
    return [...DIAMOND_PACKAGES];
  }

  // Get user diamond balance
  getBalance(userId: string): DiamondBalance {
    let balance = this.balances.get(userId);
    if (!balance) {
      balance = {
        userId,
        balance: 0,
        lifetimePurchased: 0,
        lifetimeSpent: 0,
        lastTopUp: null,
      };
      this.balances.set(userId, balance);
    }
    return balance;
  }

  // Top up diamonds (purchase package)
  topUp(userId: string, packageId: string): { success: boolean; newBalance?: number; error?: string } {
    const pkg = DIAMOND_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return { success: false, error: 'Invalid package' };

    const balance = this.getBalance(userId);
    const totalDiamonds = pkg.diamonds + pkg.bonusDiamonds;
    balance.balance += totalDiamonds;
    balance.lifetimePurchased += totalDiamonds;
    balance.lastTopUp = Date.now();
    this.balances.set(userId, balance);

    return { success: true, newBalance: balance.balance };
  }

  // Send a gift
  sendGift(params: {
    senderId: string;
    recipientId: string;
    streamId: string;
    giftId: string;
    comboCount?: number;
  }): { success: boolean; transaction?: GiftTransaction; animationEvent?: GiftAnimationEvent; error?: string } {
    const gift = GIFT_CATALOG.find(g => g.id === params.giftId);
    if (!gift) return { success: false, error: 'Invalid gift' };

    const senderBalance = this.getBalance(params.senderId);
    if (senderBalance.balance < gift.priceInDiamonds) {
      return { success: false, error: 'Insufficient diamonds' };
    }

    // Deduct diamonds from sender
    senderBalance.balance -= gift.priceInDiamonds;
    senderBalance.lifetimeSpent += gift.priceInDiamonds;
    this.balances.set(params.senderId, senderBalance);

    // Record transaction
    const transaction: GiftTransaction = {
      id: `gift_tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      senderId: params.senderId,
      recipientId: params.recipientId,
      streamId: params.streamId,
      giftId: params.giftId,
      giftName: gift.name,
      diamondCost: gift.priceInDiamonds,
      comboCount: params.comboCount || 1,
      timestamp: Date.now(),
      animationTriggered: true,
    };
    this.transactions.push(transaction);

    // Trigger animation event
    const animationEvent: GiftAnimationEvent = {
      transactionId: transaction.id,
      giftId: gift.id,
      animation: gift.animation,
      comboLevel: params.comboCount || 1,
      senderName: params.senderId,
      streamId: params.streamId,
      timestamp: Date.now(),
    };
    this.animationEvents.push(animationEvent);

    // Update stream gifters
    this.updateStreamGifters(params.streamId, params.senderId, gift.priceInDiamonds);

    // Credit creator revenue (70% split)
    this.creditCreatorRevenue(params.recipientId, gift.priceInDiamonds);

    return { success: true, transaction, animationEvent };
  }

  // Update stream gifter tracking
  private updateStreamGifters(streamId: string, senderId: string, diamonds: number): void {
    const gifters = this.streamGifters.get(streamId) || [];
    const existing = gifters.find(g => g.userId === senderId);

    if (existing) {
      existing.totalDiamonds += diamonds;
      existing.giftCount++;
      existing.lastGiftAt = Date.now();
    } else {
      gifters.push({
        userId: senderId,
        displayName: senderId,
        avatarUrl: '/avatars/default.jpg',
        totalDiamonds: diamonds,
        giftCount: 1,
        lastGiftAt: Date.now(),
      });
    }

    // Sort by total diamonds
    gifters.sort((a, b) => b.totalDiamonds - a.totalDiamonds);
    this.streamGifters.set(streamId, gifters);
  }

  // Credit creator revenue
  private creditCreatorRevenue(creatorId: string, diamonds: number): void {
    let revenue = this.creatorRevenue.get(creatorId);
    if (!revenue) {
      revenue = {
        creatorId,
        totalDiamondsReceived: 0,
        revenueShare: CREATOR_REVENUE_SHARE,
        pendingPayout: 0,
        lifetimePayout: 0,
      };
    }

    revenue.totalDiamondsReceived += diamonds;
    const creatorDiamonds = Math.floor(diamonds * CREATOR_REVENUE_SHARE);
    revenue.pendingPayout += creatorDiamonds * DIAMOND_TO_USD;
    this.creatorRevenue.set(creatorId, revenue);
  }

  // Get top gifters for a stream
  getStreamLeaderboard(streamId: string, limit: number = 10): StreamGifterEntry[] {
    const gifters = this.streamGifters.get(streamId) || [];
    return gifters.slice(0, limit);
  }

  // Get lifetime gifter leaderboard
  getLifetimeLeaderboard(limit: number = 50): LeaderboardEntry[] {
    const userTotals: Map<string, { diamonds: number; creators: Set<string> }> = new Map();

    for (const tx of this.transactions) {
      const entry = userTotals.get(tx.senderId) || { diamonds: 0, creators: new Set() };
      entry.diamonds += tx.diamondCost;
      entry.creators.add(tx.recipientId);
      userTotals.set(tx.senderId, entry);
    }

    const entries: LeaderboardEntry[] = Array.from(userTotals.entries())
      .map(([userId, data], index) => ({
        rank: index + 1,
        userId,
        displayName: userId,
        avatarUrl: '/avatars/default.jpg',
        totalDiamondsGifted: data.diamonds,
        uniqueCreatorsSupported: data.creators.size,
      }))
      .sort((a, b) => b.totalDiamondsGifted - a.totalDiamondsGifted);

    // Assign ranks after sorting
    entries.forEach((entry, i) => { entry.rank = i + 1; });

    return entries.slice(0, limit);
  }

  // Get creator revenue info
  getCreatorRevenue(creatorId: string): CreatorRevenue | null {
    return this.creatorRevenue.get(creatorId) || null;
  }

  // Get gift history for a user
  getGiftHistory(userId: string, role: 'sender' | 'recipient'): GiftTransaction[] {
    if (role === 'sender') {
      return this.transactions.filter(t => t.senderId === userId);
    }
    return this.transactions.filter(t => t.recipientId === userId);
  }

  // Get recent animation events for a stream
  getRecentAnimations(streamId: string, limit: number = 20): GiftAnimationEvent[] {
    return this.animationEvents
      .filter(e => e.streamId === streamId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

export const giftsService = new GiftsService();
export default giftsService;
