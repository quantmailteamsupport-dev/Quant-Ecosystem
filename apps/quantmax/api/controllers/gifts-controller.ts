// ============================================================================
// QuantMax - Gifts Controller
// Methods: getCatalog, sendGift, getBalance, topUp, getLeaderboard
// ============================================================================

import { giftsService } from '../services/gifts-service';

interface Request {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  user?: { id: string; displayName: string };
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class GiftsController {
  // GET /api/gifts/catalog - Get gift catalog
  async getCatalog(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;
      const catalog = giftsService.getCatalog(category || undefined);
      const packages = giftsService.getPackages();

      res.status(200).json({
        success: true,
        data: {
          gifts: catalog,
          diamondPackages: packages,
          totalGifts: catalog.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to get catalog', detail: error.message });
    }
  }

  // POST /api/gifts/send - Send a gift
  async sendGift(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { giftId, recipientId, streamId, comboCount } = req.body;

      if (!giftId) {
        res.status(400).json({ success: false, error: 'Gift ID is required' });
        return;
      }
      if (!recipientId) {
        res.status(400).json({ success: false, error: 'Recipient ID is required' });
        return;
      }
      if (!streamId) {
        res.status(400).json({ success: false, error: 'Stream ID is required' });
        return;
      }

      const result = giftsService.sendGift({
        senderId: userId,
        recipientId,
        streamId,
        giftId,
        comboCount: comboCount || 1,
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      const newBalance = giftsService.getBalance(userId);

      res.status(200).json({
        success: true,
        data: {
          transaction: result.transaction,
          animation: result.animationEvent,
          remainingBalance: newBalance.balance,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to send gift', detail: error.message });
    }
  }

  // GET /api/gifts/balance - Get diamond balance
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const balance = giftsService.getBalance(userId);

      res.status(200).json({
        success: true,
        data: {
          balance: balance.balance,
          lifetimePurchased: balance.lifetimePurchased,
          lifetimeSpent: balance.lifetimeSpent,
          lastTopUp: balance.lastTopUp,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to get balance', detail: error.message });
    }
  }

  // POST /api/gifts/topup - Top up diamonds
  async topUp(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const { packageId } = req.body;
      if (!packageId) {
        res.status(400).json({ success: false, error: 'Package ID is required' });
        return;
      }

      const result = giftsService.topUp(userId, packageId);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          newBalance: result.newBalance,
          message: 'Diamonds added successfully',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to top up', detail: error.message });
    }
  }

  // GET /api/gifts/leaderboard/:streamId - Get leaderboard
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { streamId } = req.params;
      const limit = parseInt(req.query.limit || '10', 10);

      if (!streamId) {
        res.status(400).json({ success: false, error: 'Stream ID is required' });
        return;
      }

      const streamLeaderboard = giftsService.getStreamLeaderboard(streamId, limit);
      const globalLeaderboard = giftsService.getLifetimeLeaderboard(10);

      res.status(200).json({
        success: true,
        data: {
          stream: {
            streamId,
            topGifters: streamLeaderboard,
            total: streamLeaderboard.length,
          },
          global: {
            topGifters: globalLeaderboard,
            total: globalLeaderboard.length,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to get leaderboard', detail: error.message });
    }
  }
}

export default GiftsController;
