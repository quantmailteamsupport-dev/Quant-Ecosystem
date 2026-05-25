// ============================================================================
// QuantTube - Membership Controller
// Channel membership tiers, subscriptions, perks, revenue
// ============================================================================

import type { Request, Response } from '../middleware';
import { membershipService } from '../services/membership-service';

class MembershipController {
  async createTier(req: Request, res: Response): Promise<void> {
    try {
      const { channelId, name, price, perks } = req.body as { channelId: string; name: string; price: number; perks: any[] };
      if (!channelId || !name || !price) {
        res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'channelId, name, and price are required' } });
        return;
      }
      const tier = await membershipService.createTier(channelId, name, price, perks || []);
      res.status(201).json({ success: true, data: tier });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'CREATE_TIER_ERROR', message: error.message } });
    }
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const { userId, tierId } = req.body as { userId: string; tierId: string };
      if (!userId || !tierId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId and tierId are required' } });
        return;
      }
      const membership = await membershipService.subscribe(userId, tierId);
      res.status(201).json({ success: true, data: membership });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'SUBSCRIBE_ERROR', message: error.message } });
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { membershipId } = req.params as { membershipId: string };
      const membership = await membershipService.cancel(membershipId);
      res.status(200).json({ success: true, data: membership });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'CANCEL_ERROR', message: error.message } });
    }
  }

  async getPerks(req: Request, res: Response): Promise<void> {
    try {
      const { membershipId } = req.params as { membershipId: string };
      const perks = await membershipService.getPerks(membershipId);
      res.status(200).json({ success: true, data: perks });
    } catch (error: any) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
  }

  async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params as { channelId: string };
      const { tierId, status, limit, offset } = req.query as any;
      const result = await membershipService.getMembers(channelId, { tierId, status, limit: Number(limit) || 50, offset: Number(offset) || 0 });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async processRenewal(req: Request, res: Response): Promise<void> {
    try {
      const { membershipId } = req.params as { membershipId: string };
      const membership = await membershipService.processRenewal(membershipId);
      res.status(200).json({ success: true, data: membership });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'RENEWAL_ERROR', message: error.message } });
    }
  }

  async getRevenue(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params as { channelId: string };
      const revenue = await membershipService.getRevenue(channelId);
      res.status(200).json({ success: true, data: revenue });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async addBadge(req: Request, res: Response): Promise<void> {
    try {
      const { channelId, tierId } = req.params as { channelId: string; tierId: string };
      const badge = req.body as any;
      const result = await membershipService.addBadge(channelId, tierId, badge);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'BADGE_ERROR', message: error.message } });
    }
  }
}

export const membershipController = new MembershipController();
export { MembershipController };
