// ============================================================================
// QuantSync API - Monetization Controller
// Subscription tiers, tips, paywalls, earnings management
// ============================================================================

import type { Request, Response } from '../middleware';
import { monetizationService } from '../services/monetization-service';

export class MonetizationController {
  async createTier(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { name: string; description: string; price: number; benefits: string[]; maxSubscribers?: number };

    if (!body.name || !body.price || !body.benefits) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Name, price, and benefits are required', statusCode: 400 } });
      return;
    }

    try {
      const tier = await monetizationService.createSubscriptionTier(userId, body);
      res.status(201).json({ success: true, data: tier });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create tier';
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const tierId = req.params['tierId'];

    try {
      const subscription = await monetizationService.subscribe(userId, tierId);
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to subscribe';
      res.status(400).json({ success: false, error: { code: 'SUBSCRIBE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const tierId = req.params['tierId'];

    try {
      const subscription = await monetizationService.unsubscribe(userId, tierId);
      res.status(200).json({ success: true, data: subscription });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to unsubscribe';
      res.status(400).json({ success: false, error: { code: 'UNSUBSCRIBE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async tipCreator(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { creatorId: string; amount: number; message?: string; postId?: string };

    if (!body.creatorId || !body.amount) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Creator ID and amount are required', statusCode: 400 } });
      return;
    }

    try {
      const tip = await monetizationService.tipCreator(userId, body.creatorId, body.amount, { message: body.message, postId: body.postId });
      res.status(201).json({ success: true, data: tip });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send tip';
      res.status(400).json({ success: false, error: { code: 'TIP_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getEarnings(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const earnings = await monetizationService.getEarnings(userId);
    res.status(200).json({ success: true, data: earnings });
  }

  async getSubscribers(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const subscribers = await monetizationService.getSubscribers(userId);
    res.status(200).json({ success: true, data: subscribers, metadata: { count: subscribers.length } });
  }

  async withdraw(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { amount: number };

    if (!body.amount) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Amount is required', statusCode: 400 } });
      return;
    }

    try {
      const result = await monetizationService.withdrawEarnings(userId, body.amount);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to withdraw';
      res.status(400).json({ success: false, error: { code: 'WITHDRAW_FAILED', message: msg, statusCode: 400 } });
    }
  }
}

export const monetizationController = new MonetizationController();
