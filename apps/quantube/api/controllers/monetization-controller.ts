// ============================================================================
// QuantTube API - Monetization Controller
// Creator monetization, ad revenue share, memberships, super chats, merchandise
// ============================================================================

import type { Request, Response } from '../middleware';

interface CreatorMonetization {
  userId: string;
  channelId: string;
  enrolled: boolean;
  enrolledAt: string;
  tier: 'standard' | 'partner' | 'premium';
  totalEarnings: number;
  pendingPayout: number;
  adRevenueShare: number;
  membershipRevenue: number;
  superChatRevenue: number;
  merchandiseRevenue: number;
  sponsorshipRevenue: number;
  payoutMethod: string;
  adSettings: { preroll: boolean; midroll: boolean; postroll: boolean; banners: boolean };
}

interface Payout {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method: string;
  requestedAt: string;
  completedAt?: string;
}

const monetizations: Map<string, CreatorMonetization> = new Map();
const payouts: Map<string, Payout[]> = new Map();

class MonetizationController {
  async enroll(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const body = req.body as any;
    const mon: CreatorMonetization = { userId, channelId: body.channelId || req.user?.channelId || '', enrolled: true, enrolledAt: new Date().toISOString(), tier: 'standard', totalEarnings: 0, pendingPayout: 0, adRevenueShare: 0, membershipRevenue: 0, superChatRevenue: 0, merchandiseRevenue: 0, sponsorshipRevenue: 0, payoutMethod: body.payoutMethod || 'bank_transfer', adSettings: { preroll: true, midroll: true, postroll: false, banners: true } };
    monetizations.set(userId, mon);
    res.status(201).json({ success: true, data: { monetization: mon } });
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const mon = monetizations.get(userId);
    if (!mon) { res.status(200).json({ success: true, data: { enrolled: false, eligibility: { subscribers: 1000, watchHours: 4000 } } }); return; }
    res.status(200).json({ success: true, data: { monetization: mon } });
  }

  async getEarnings(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const mon = monetizations.get(userId);
    if (!mon) { res.status(404).json({ success: false, error: { code: 'NOT_ENROLLED', message: 'Not enrolled in monetization', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { total: mon.totalEarnings, pending: mon.pendingPayout, thisMonth: mon.totalEarnings * 0.1, lastMonth: mon.totalEarnings * 0.09, currency: 'USD' } });
  }

  async getEarningsBreakdown(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const mon = monetizations.get(userId);
    if (!mon) { res.status(404).json({ success: false, error: { code: 'NOT_ENROLLED', message: 'Not enrolled in monetization', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { breakdown: { adRevenue: mon.adRevenueShare, memberships: mon.membershipRevenue, superChats: mon.superChatRevenue, merchandise: mon.merchandiseRevenue, sponsorships: mon.sponsorshipRevenue }, percentages: { adRevenue: 0.55, memberships: 0.20, superChats: 0.10, merchandise: 0.10, sponsorships: 0.05 } } });
  }

  async requestPayout(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const mon = monetizations.get(userId);
    if (!mon) { res.status(404).json({ success: false, error: { code: 'NOT_ENROLLED', message: 'Not enrolled', statusCode: 404 } }); return; }
    if (mon.pendingPayout < 100) { res.status(400).json({ success: false, error: { code: 'MIN_PAYOUT', message: 'Minimum payout is $100', statusCode: 400 } }); return; }
    const payout: Payout = { id: `pay_${Date.now().toString(36)}`, userId, amount: mon.pendingPayout, currency: 'USD', status: 'pending', method: mon.payoutMethod, requestedAt: new Date().toISOString() };
    const userPayouts = payouts.get(userId) || [];
    userPayouts.push(payout);
    payouts.set(userId, userPayouts);
    mon.pendingPayout = 0;
    res.status(200).json({ success: true, data: { payout } });
  }

  async getPayoutHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userPayouts = payouts.get(userId) || [];
    res.status(200).json({ success: true, data: { payouts: userPayouts } });
  }

  async setupMembership(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(201).json({ success: true, data: { membershipId: `memship_${Date.now().toString(36)}`, channelId: body.channelId, tiers: body.tiers || [{ name: 'Basic', price: 4.99, perks: ['Badge', 'Emotes'] }, { name: 'Premium', price: 9.99, perks: ['Badge', 'Emotes', 'Exclusive Content', 'Early Access'] }] } });
  }

  async updateMembershipTiers(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(200).json({ success: true, data: { tiers: body.tiers } });
  }

  async getMembershipSubscribers(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { subscribers: [], totalMembers: 0, monthlyRevenue: 0 } });
  }

  async getSuperChatRevenue(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const mon = monetizations.get(userId);
    res.status(200).json({ success: true, data: { total: mon?.superChatRevenue || 0, thisMonth: 0, topSuperChats: [] } });
  }

  async setupMerchandise(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(201).json({ success: true, data: { storeId: `store_${Date.now().toString(36)}`, products: body.products || [], channelId: body.channelId } });
  }

  async getMerchandise(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { products: [], totalSales: 0 } });
  }

  async getAdRevenue(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const mon = monetizations.get(userId);
    res.status(200).json({ success: true, data: { total: mon?.adRevenueShare || 0, cpm: 3.50, impressions: 0, revenue30d: [], revenueByVideo: [] } });
  }

  async updateAdSettings(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const mon = monetizations.get(userId);
    if (!mon) { res.status(404).json({ success: false, error: { code: 'NOT_ENROLLED', message: 'Not enrolled', statusCode: 404 } }); return; }
    const body = req.body as any;
    if (body.preroll !== undefined) mon.adSettings.preroll = body.preroll;
    if (body.midroll !== undefined) mon.adSettings.midroll = body.midroll;
    if (body.postroll !== undefined) mon.adSettings.postroll = body.postroll;
    if (body.banners !== undefined) mon.adSettings.banners = body.banners;
    res.status(200).json({ success: true, data: { adSettings: mon.adSettings } });
  }

  async getSponsorships(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { sponsorships: [], available: [] } });
  }
}

export const monetizationController = new MonetizationController();
