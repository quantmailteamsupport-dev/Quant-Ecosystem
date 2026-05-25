// ============================================================================
// QuantTube - Membership Service
// Channel memberships, tiers, perks, badges, renewals, revenue tracking
// ============================================================================

interface MembershipTier {
  id: string;
  channelId: string;
  name: string;
  price: number;
  currency: string;
  perks: MembershipPerk[];
  badge: MembershipBadge;
  maxMembers: number;
  currentMembers: number;
  createdAt: string;
  isActive: boolean;
}

interface MembershipPerk {
  id: string;
  type: 'badge' | 'emoji' | 'content' | 'chat' | 'community' | 'discount' | 'early_access';
  name: string;
  description: string;
  value: string;
}

interface MembershipBadge {
  id: string;
  name: string;
  imageUrl: string;
  tier: number;
  loyaltyMonths: number;
}

interface Membership {
  id: string;
  userId: string;
  channelId: string;
  tierId: string;
  status: 'active' | 'cancelled' | 'expired' | 'paused';
  startedAt: string;
  renewsAt: string;
  cancelledAt?: string;
  totalMonths: number;
  totalSpent: number;
  badge: MembershipBadge;
}

interface MembershipRevenue {
  channelId: string;
  totalRevenue: number;
  monthlyRevenue: number;
  memberCount: number;
  churnRate: number;
  avgLifetimeMonths: number;
  revenueByTier: { tierId: string; tierName: string; revenue: number; members: number }[];
}

class MembershipService {
  private tiers: Map<string, MembershipTier> = new Map();
  private memberships: Map<string, Membership> = new Map();
  private channelTiers: Map<string, string[]> = new Map();
  private userMemberships: Map<string, string[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async createTier(channelId: string, name: string, price: number, perks: Omit<MembershipPerk, 'id'>[]): Promise<MembershipTier> {
    if (price < 0.99 || price > 99.99) throw new Error('Price must be between 0.99 and 99.99');
    if (name.length < 2 || name.length > 50) throw new Error('Tier name must be 2-50 characters');
    const existingTiers = this.channelTiers.get(channelId) || [];
    if (existingTiers.length >= 5) throw new Error('Maximum 5 tiers per channel');

    const tier: MembershipTier = {
      id: this.genId('tier'),
      channelId,
      name: name.trim(),
      price: Math.round(price * 100) / 100,
      currency: 'USD',
      perks: perks.map(p => ({ ...p, id: this.genId('perk') })),
      badge: { id: this.genId('badge'), name: `${name} Badge`, imageUrl: `https://cdn.quant.tube/badges/${channelId}/${name.toLowerCase().replace(/\s+/g, '_')}.png`, tier: existingTiers.length + 1, loyaltyMonths: 0 },
      maxMembers: 10000,
      currentMembers: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    this.tiers.set(tier.id, tier);
    existingTiers.push(tier.id);
    this.channelTiers.set(channelId, existingTiers);
    return tier;
  }

  async subscribe(userId: string, tierId: string): Promise<Membership> {
    const tier = this.tiers.get(tierId);
    if (!tier) throw new Error('Tier not found');
    if (!tier.isActive) throw new Error('Tier is not active');
    if (tier.currentMembers >= tier.maxMembers) throw new Error('Tier is full');

    const existingMemberships = this.userMemberships.get(userId) || [];
    const alreadyMember = existingMemberships.find(mId => {
      const m = this.memberships.get(mId);
      return m && m.channelId === tier.channelId && m.status === 'active';
    });
    if (alreadyMember) throw new Error('Already a member of this channel');

    const membership: Membership = {
      id: this.genId('mem'), userId, channelId: tier.channelId, tierId,
      status: 'active', startedAt: new Date().toISOString(),
      renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      totalMonths: 1, totalSpent: tier.price, badge: tier.badge,
    };

    this.memberships.set(membership.id, membership);
    existingMemberships.push(membership.id);
    this.userMemberships.set(userId, existingMemberships);
    tier.currentMembers++;
    return membership;
  }

  async cancel(membershipId: string): Promise<Membership> {
    const membership = this.memberships.get(membershipId);
    if (!membership) throw new Error('Membership not found');
    if (membership.status !== 'active') throw new Error('Membership is not active');
    membership.status = 'cancelled';
    membership.cancelledAt = new Date().toISOString();
    const tier = this.tiers.get(membership.tierId);
    if (tier) tier.currentMembers = Math.max(0, tier.currentMembers - 1);
    return membership;
  }

  async getPerks(membershipId: string): Promise<MembershipPerk[]> {
    const membership = this.memberships.get(membershipId);
    if (!membership) throw new Error('Membership not found');
    const tier = this.tiers.get(membership.tierId);
    if (!tier) throw new Error('Tier not found');
    const loyaltyPerks: MembershipPerk[] = [];
    if (membership.totalMonths >= 6) loyaltyPerks.push({ id: 'loyalty_6', type: 'badge', name: '6 Month Loyalty', description: 'Exclusive 6-month badge', value: 'gold' });
    if (membership.totalMonths >= 12) loyaltyPerks.push({ id: 'loyalty_12', type: 'badge', name: '1 Year Loyalty', description: 'Exclusive 1-year badge', value: 'diamond' });
    return [...tier.perks, ...loyaltyPerks];
  }

  async addBadge(channelId: string, tierId: string, badge: Omit<MembershipBadge, 'id'>): Promise<MembershipBadge> {
    const tier = this.tiers.get(tierId);
    if (!tier || tier.channelId !== channelId) throw new Error('Tier not found for channel');
    const newBadge: MembershipBadge = { ...badge, id: this.genId('badge') };
    tier.badge = newBadge;
    return newBadge;
  }

  async getMembers(channelId: string, opts?: { tierId?: string; status?: string; limit?: number; offset?: number }): Promise<{ members: Membership[]; total: number }> {
    let filtered = Array.from(this.memberships.values()).filter(m => m.channelId === channelId);
    if (opts?.tierId) filtered = filtered.filter(m => m.tierId === opts.tierId);
    if (opts?.status) filtered = filtered.filter(m => m.status === opts.status);
    const total = filtered.length;
    return { members: filtered.slice(opts?.offset || 0, (opts?.offset || 0) + (opts?.limit || 50)), total };
  }

  async processRenewal(membershipId: string): Promise<Membership> {
    const membership = this.memberships.get(membershipId);
    if (!membership) throw new Error('Membership not found');
    if (membership.status !== 'active') throw new Error('Cannot renew inactive membership');
    const tier = this.tiers.get(membership.tierId);
    if (!tier) throw new Error('Tier not found');
    membership.totalMonths++;
    membership.totalSpent += tier.price;
    membership.renewsAt = new Date(Date.now() + 30 * 86400000).toISOString();
    if (membership.totalMonths % 6 === 0) {
      membership.badge = { ...membership.badge, loyaltyMonths: membership.totalMonths, name: `${tier.name} - ${membership.totalMonths}mo` };
    }
    return membership;
  }

  async getRevenue(channelId: string): Promise<MembershipRevenue> {
    const allM = Array.from(this.memberships.values()).filter(m => m.channelId === channelId);
    const active = allM.filter(m => m.status === 'active');
    const cancelled = allM.filter(m => m.status === 'cancelled');
    const totalRevenue = allM.reduce((s, m) => s + m.totalSpent, 0);
    const monthlyRevenue = active.reduce((s, m) => { const t = this.tiers.get(m.tierId); return s + (t?.price || 0); }, 0);
    const churnRate = allM.length > 0 ? (cancelled.length / allM.length) * 100 : 0;
    const avgLifetime = allM.length > 0 ? allM.reduce((s, m) => s + m.totalMonths, 0) / allM.length : 0;
    const tierIds = this.channelTiers.get(channelId) || [];
    const revenueByTier = tierIds.map(tId => {
      const tier = this.tiers.get(tId);
      const tm = allM.filter(m => m.tierId === tId);
      return { tierId: tId, tierName: tier?.name || 'Unknown', revenue: tm.reduce((s, m) => s + m.totalSpent, 0), members: tm.filter(m => m.status === 'active').length };
    });
    return { channelId, totalRevenue, monthlyRevenue, memberCount: active.length, churnRate: Math.round(churnRate * 100) / 100, avgLifetimeMonths: Math.round(avgLifetime * 10) / 10, revenueByTier };
  }

  async sendWelcome(membershipId: string): Promise<{ sent: boolean; message: string }> {
    const membership = this.memberships.get(membershipId);
    if (!membership) throw new Error('Membership not found');
    const tier = this.tiers.get(membership.tierId);
    return { sent: true, message: `Welcome to ${tier?.name || 'the membership'}! Your perks are now active.` };
  }
}

export const membershipService = new MembershipService();
export { MembershipService };
