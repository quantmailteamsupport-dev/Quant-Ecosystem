// ============================================================================
// QuantMax - Live Gifts Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { liveGiftsService } from '../services/live-gifts-service';

class LiveGiftsController {
  async sendGift(req: Request, res: Response): Promise<void> {
    try {
      const { streamId, senderId, senderName, giftType, quantity, message } = req.body as any;
      if (!streamId || !senderId || !giftType) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'streamId, senderId, and giftType required' } }); return; }
      const gift = await liveGiftsService.sendGift(streamId, senderId, senderName || 'Anonymous', giftType, quantity || 1, message);
      res.status(201).json({ success: true, data: gift });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'GIFT_ERROR', message: error.message } }); }
  }

  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { streamId } = req.params as { streamId: string };
      const { limit } = req.query as { limit?: string };
      const leaderboard = await liveGiftsService.getLeaderboard(streamId, Number(limit) || 10);
      res.status(200).json({ success: true, data: leaderboard });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async cashOut(req: Request, res: Response): Promise<void> {
    try {
      const { userId, coins, currency } = req.body as any;
      if (!userId || !coins) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId and coins required' } }); return; }
      const result = await liveGiftsService.cashOut(userId, coins, currency);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'CASHOUT_ERROR', message: error.message } }); }
  }

  async getCatalog(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query as { category?: any };
      const catalog = await liveGiftsService.getGiftCatalog(category);
      res.status(200).json({ success: true, data: catalog });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async buyCoins(req: Request, res: Response): Promise<void> {
    try {
      const { userId, amount, currency } = req.body as any;
      if (!userId || !amount) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId and amount required' } }); return; }
      const balance = await liveGiftsService.buyCoins(userId, amount, currency);
      res.status(200).json({ success: true, data: balance });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'BUY_ERROR', message: error.message } }); }
  }
}

export const liveGiftsController = new LiveGiftsController();
export { LiveGiftsController };
