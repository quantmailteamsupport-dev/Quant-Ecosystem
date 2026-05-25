// ============================================================================
// QuantMax - Live Gifts Service
// Virtual gifts during livestreams, coin system, leaderboards, cashout
// ============================================================================

interface Gift {
  id: string;
  streamId: string;
  senderId: string;
  senderName: string;
  giftType: string;
  quantity: number;
  coinValue: number;
  totalCoins: number;
  animation: string;
  message?: string;
  sentAt: string;
}

interface GiftCatalogItem {
  id: string;
  name: string;
  category: 'basic' | 'premium' | 'luxury' | 'special' | 'event';
  coinCost: number;
  animationUrl: string;
  thumbnailUrl: string;
  isAnimated: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  availableUntil?: string;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalCoins: number;
  giftCount: number;
  rank: number;
  badge: string;
}

interface CashoutRequest {
  id: string;
  userId: string;
  coins: number;
  targetCurrency: string;
  amount: number;
  exchangeRate: number;
  fees: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
}

interface CoinBalance {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  pendingCashout: number;
}

interface EarningsReport {
  userId: string;
  period: string;
  totalCoins: number;
  totalUSD: number;
  topGifters: LeaderboardEntry[];
  byDay: { date: string; coins: number }[];
  avgPerStream: number;
}

class LiveGiftsService {
  private gifts: Map<string, Gift[]> = new Map();
  private catalog: Map<string, GiftCatalogItem> = new Map();
  private balances: Map<string, CoinBalance> = new Map();
  private cashouts: Map<string, CashoutRequest[]> = new Map();
  private minCashout: number = 10000;
  private exchangeRate: number = 0.01;
  private counter: number = 0;

  constructor() {
    this.initCatalog();
  }

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  private initCatalog(): void {
    const items: Omit<GiftCatalogItem, 'id'>[] = [
      { name: 'Rose', category: 'basic', coinCost: 1, animationUrl: '/anims/rose.json', thumbnailUrl: '/gifts/rose.png', isAnimated: true, rarity: 'common' },
      { name: 'Heart', category: 'basic', coinCost: 5, animationUrl: '/anims/heart.json', thumbnailUrl: '/gifts/heart.png', isAnimated: true, rarity: 'common' },
      { name: 'Star', category: 'basic', coinCost: 10, animationUrl: '/anims/star.json', thumbnailUrl: '/gifts/star.png', isAnimated: true, rarity: 'common' },
      { name: 'Crown', category: 'premium', coinCost: 100, animationUrl: '/anims/crown.json', thumbnailUrl: '/gifts/crown.png', isAnimated: true, rarity: 'rare' },
      { name: 'Dragon', category: 'premium', coinCost: 500, animationUrl: '/anims/dragon.json', thumbnailUrl: '/gifts/dragon.png', isAnimated: true, rarity: 'epic' },
      { name: 'Universe', category: 'luxury', coinCost: 5000, animationUrl: '/anims/universe.json', thumbnailUrl: '/gifts/universe.png', isAnimated: true, rarity: 'legendary' },
      { name: 'Diamond Ring', category: 'luxury', coinCost: 10000, animationUrl: '/anims/ring.json', thumbnailUrl: '/gifts/ring.png', isAnimated: true, rarity: 'legendary' },
      { name: 'Rocket', category: 'special', coinCost: 1000, animationUrl: '/anims/rocket.json', thumbnailUrl: '/gifts/rocket.png', isAnimated: true, rarity: 'epic' },
    ];

    items.forEach((item, i) => {
      const catalogItem: GiftCatalogItem = { id: `gift_${i}`, ...item };
      this.catalog.set(catalogItem.id, catalogItem);
    });
  }

  async sendGift(streamId: string, senderId: string, senderName: string, giftType: string, quantity: number = 1, message?: string): Promise<Gift> {
    const catalogItem = this.catalog.get(giftType);
    if (!catalogItem) throw new Error('Gift type not found');
    if (quantity < 1 || quantity > 999) throw new Error('Quantity must be 1-999');

    const totalCoins = catalogItem.coinCost * quantity;
    const balance = this.balances.get(senderId);
    if (!balance || balance.balance < totalCoins) throw new Error('Insufficient coin balance');

    balance.balance -= totalCoins;
    balance.totalSpent += totalCoins;

    const gift: Gift = {
      id: this.genId('gift'),
      streamId, senderId, senderName, giftType,
      quantity, coinValue: catalogItem.coinCost, totalCoins,
      animation: catalogItem.animationUrl,
      message: message?.substring(0, 100),
      sentAt: new Date().toISOString(),
    };

    const streamGifts = this.gifts.get(streamId) || [];
    streamGifts.push(gift);
    this.gifts.set(streamId, streamGifts);

    // Credit streamer
    const streamerId = `streamer_${streamId.substring(0, 6)}`;
    const streamerBalance = this.balances.get(streamerId) || { userId: streamerId, balance: 0, totalEarned: 0, totalSpent: 0, pendingCashout: 0 };
    streamerBalance.balance += Math.floor(totalCoins * 0.7); // 70% to streamer
    streamerBalance.totalEarned += Math.floor(totalCoins * 0.7);
    this.balances.set(streamerId, streamerBalance);

    return gift;
  }

  async convertCurrency(coins: number, targetCurrency: string): Promise<{ coins: number; currency: string; amount: number; rate: number }> {
    const rates: Record<string, number> = { USD: 0.01, EUR: 0.009, GBP: 0.008, INR: 0.83, JPY: 1.5 };
    const rate = rates[targetCurrency] || rates.USD;
    return { coins, currency: targetCurrency, amount: Math.round(coins * rate * 100) / 100, rate };
  }

  async getLeaderboard(streamId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const streamGifts = this.gifts.get(streamId) || [];
    const userTotals = new Map<string, { coins: number; count: number; name: string }>();

    for (const gift of streamGifts) {
      const existing = userTotals.get(gift.senderId) || { coins: 0, count: 0, name: gift.senderName };
      existing.coins += gift.totalCoins;
      existing.count += gift.quantity;
      existing.name = gift.senderName;
      userTotals.set(gift.senderId, existing);
    }

    return Array.from(userTotals.entries())
      .map(([userId, data], i) => ({
        userId, username: data.name, totalCoins: data.coins, giftCount: data.count,
        rank: 0, badge: data.coins >= 10000 ? 'diamond' : data.coins >= 1000 ? 'gold' : 'silver',
      }))
      .sort((a, b) => b.totalCoins - a.totalCoins)
      .slice(0, limit)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async cashOut(userId: string, coins: number, targetCurrency: string = 'USD'): Promise<CashoutRequest> {
    const balance = this.balances.get(userId);
    if (!balance) throw new Error('No balance found');
    if (coins < this.minCashout) throw new Error(`Minimum cashout is ${this.minCashout} coins`);
    if (coins > balance.balance) throw new Error('Insufficient balance');

    const { amount, rate } = await this.convertCurrency(coins, targetCurrency);
    const fees = Math.round(amount * 0.05 * 100) / 100;
    const netAmount = Math.round((amount - fees) * 100) / 100;

    const request: CashoutRequest = {
      id: this.genId('cash'), userId, coins, targetCurrency,
      amount, exchangeRate: rate, fees, netAmount,
      status: 'pending', requestedAt: new Date().toISOString(),
    };

    balance.balance -= coins;
    balance.pendingCashout += coins;

    const userCashouts = this.cashouts.get(userId) || [];
    userCashouts.push(request);
    this.cashouts.set(userId, userCashouts);

    return request;
  }

  async setMinCashout(amount: number): Promise<{ minCashout: number }> {
    if (amount < 1000 || amount > 100000) throw new Error('Min cashout must be 1000-100000 coins');
    this.minCashout = amount;
    return { minCashout: this.minCashout };
  }

  async getAnimations(giftType: string): Promise<{ giftType: string; animationUrl: string; duration: number; frames: number }> {
    const item = this.catalog.get(giftType);
    if (!item) throw new Error('Gift type not found');
    return { giftType, animationUrl: item.animationUrl, duration: item.rarity === 'legendary' ? 5 : 3, frames: item.rarity === 'legendary' ? 150 : 90 };
  }

  async getGiftCatalog(category?: GiftCatalogItem['category']): Promise<GiftCatalogItem[]> {
    let items = Array.from(this.catalog.values());
    if (category) items = items.filter(i => i.category === category);
    return items.sort((a, b) => a.coinCost - b.coinCost);
  }

  async getEarningsReport(userId: string, period: string = '30d'): Promise<EarningsReport> {
    const allGifts = Array.from(this.gifts.values()).flat();
    const streamerGifts = allGifts.filter(g => g.streamId.includes(userId.substring(0, 6)));
    const totalCoins = streamerGifts.reduce((s, g) => s + g.totalCoins, 0);
    const { amount } = await this.convertCurrency(totalCoins, 'USD');
    const topGifters = await this.getLeaderboard(streamerGifts[0]?.streamId || '', 5);
    const days = period === '7d' ? 7 : 30;
    const byDay = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0],
      coins: Math.floor(totalCoins / days * (0.5 + Math.random())),
    }));
    return { userId, period, totalCoins, totalUSD: amount, topGifters, byDay, avgPerStream: streamerGifts.length > 0 ? totalCoins / new Set(streamerGifts.map(g => g.streamId)).size : 0 };
  }

  async buyCoins(userId: string, amount: number, currency: string = 'USD'): Promise<CoinBalance> {
    if (amount < 1 || amount > 10000) throw new Error('Amount must be $1-$10,000');
    const coins = Math.floor(amount / this.exchangeRate);
    const balance = this.balances.get(userId) || { userId, balance: 0, totalEarned: 0, totalSpent: 0, pendingCashout: 0 };
    balance.balance += coins;
    balance.totalEarned += coins;
    this.balances.set(userId, balance);
    return balance;
  }
}

export const liveGiftsService = new LiveGiftsService();
export { LiveGiftsService };
