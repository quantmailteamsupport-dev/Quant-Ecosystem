// ============================================================================
// QuantAds - Bidding Controller
// Real-time bidding, CPM/CPC/CPA models, auction system
// ============================================================================

import type { Request, Response } from '../middleware';
import type { BidRequest, AppPlacement } from '../../src/types';
import { auctionService } from '../services/auction-service';
import { targetingService } from '../services/targeting-service';
import { deliveryService } from '../services/delivery-service';

class BiddingController {
  async requestBid(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      app: AppPlacement;
      position: string;
      userId: string;
      context?: Record<string, unknown>;
    };

    if (!body.app || !body.position || !body.userId) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'app, position, and userId are required', statusCode: 400 } });
      return;
    }

    const userProfile = targetingService.getUserProfile(body.userId);

    const bidRequest: BidRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      impressionId: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId: body.userId,
      placement: {
        id: `slot_${body.app}_${body.position}`,
        app: body.app,
        position: body.position as any,
        format: ['image', 'native'],
        dimensions: { width: 600, height: 400 },
        floor_cpm: 2.0,
        fillRate: 0.8,
      },
      userProfile,
      timestamp: Date.now(),
      floorPrice: 2.0,
    };

    const result = await auctionService.runAuction(bidRequest);

    if (!result) {
      res.status(204).json({ success: true, data: null });
      return;
    }

    res.status(200).json({ success: true, data: result });
  }

  async requestAd(req: Request, res: Response): Promise<void> {
    const body = req.body as { app: AppPlacement; position: string; userId: string };

    if (!body.app || !body.position || !body.userId) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'app, position, and userId are required', statusCode: 400 } });
      return;
    }

    const ad = await deliveryService.requestAd(body.app, body.position, body.userId);
    if (!ad) {
      res.status(204).json({ success: true, data: null });
      return;
    }

    res.status(200).json({ success: true, data: ad });
  }

  async getAuctionStats(req: Request, res: Response): Promise<void> {
    const stats = auctionService.getStats();
    res.status(200).json({ success: true, data: stats });
  }

  async getBidModels(req: Request, res: Response): Promise<void> {
    const models = [
      { id: 'cpm', name: 'Cost Per Mille (CPM)', description: 'Pay per 1,000 impressions', bestFor: 'Brand awareness and reach' },
      { id: 'cpc', name: 'Cost Per Click (CPC)', description: 'Pay when someone clicks your ad', bestFor: 'Driving traffic and engagement' },
      { id: 'cpa', name: 'Cost Per Action (CPA)', description: 'Pay when someone completes an action', bestFor: 'Conversions and sign-ups' },
      { id: 'cpv', name: 'Cost Per View (CPV)', description: 'Pay per video view (30s or completion)', bestFor: 'Video campaigns' },
      { id: 'cpi', name: 'Cost Per Install (CPI)', description: 'Pay per app install', bestFor: 'App promotion' },
    ];
    res.status(200).json({ success: true, data: models });
  }

  async getBidStrategies(req: Request, res: Response): Promise<void> {
    const strategies = [
      { id: 'lowest_cost', name: 'Lowest Cost', description: 'Get the most results for your budget', recommended: true },
      { id: 'target_cost', name: 'Target Cost', description: 'Maintain a stable average cost per result' },
      { id: 'bid_cap', name: 'Bid Cap', description: 'Set a maximum bid for each auction' },
      { id: 'cost_cap', name: 'Cost Cap', description: 'Set a maximum cost per optimization event' },
    ];
    res.status(200).json({ success: true, data: strategies });
  }
}

export const biddingController = new BiddingController();
export default BiddingController;
