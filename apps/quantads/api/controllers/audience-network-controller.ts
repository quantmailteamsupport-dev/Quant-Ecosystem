// ============================================================================
// QuantAds API - Audience Network Controller
// Publisher management, ad serving, impression tracking, revenue
// ============================================================================

import type { Request, Response } from '../middleware';
import { audienceNetwork } from '../services/audience-network-service';

export class AudienceNetworkController {
  async registerPublisher(req: Request, res: Response): Promise<void> {
    const body = req.body as { name: string; domain: string; category: string; monthlyPageviews: number; placements: any[] };

    if (!body.name || !body.domain || !body.placements) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Name, domain, and placements are required', statusCode: 400 } });
      return;
    }

    try {
      const publisher = await audienceNetwork.registerPublisher(body);
      res.status(201).json({ success: true, data: publisher });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json({ success: false, error: { code: 'REGISTER_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async serveAd(req: Request, res: Response): Promise<void> {
    const body = req.body as { placementId: string; publisherId: string; userAgent: string; ip: string; referrer: string; pageUrl: string; keywords: string[] };

    if (!body.placementId || !body.publisherId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Placement ID and publisher ID are required', statusCode: 400 } });
      return;
    }

    const ad = await audienceNetwork.serveAd(body);
    if (!ad) {
      res.status(204).json({ success: true, data: null });
      return;
    }

    res.status(200).json({ success: true, data: ad });
  }

  async trackImpression(req: Request, res: Response): Promise<void> {
    const adId = req.params['adId'];
    const body = req.body as { viewable?: boolean; duration?: number };

    try {
      const event = await audienceNetwork.trackImpression(adId, body);
      res.status(200).json({ success: true, data: event });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Tracking failed';
      res.status(400).json({ success: false, error: { code: 'TRACK_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getFillRate(req: Request, res: Response): Promise<void> {
    const publisherId = req.params['publisherId'];

    try {
      const data = await audienceNetwork.calculateFillRate(publisherId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to calculate fill rate';
      res.status(400).json({ success: false, error: { code: 'CALC_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getRevenueReport(req: Request, res: Response): Promise<void> {
    const publisherId = req.params['publisherId'];
    const period = req.query['period'] as string | undefined;

    try {
      const report = await audienceNetwork.getRevenueReport(publisherId, period);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get revenue report';
      res.status(400).json({ success: false, error: { code: 'REPORT_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async qualifyPublisher(req: Request, res: Response): Promise<void> {
    const publisherId = req.params['publisherId'];
    const body = req.body as { approve: boolean };

    try {
      const publisher = await audienceNetwork.qualifyPublisher(publisherId, body.approve);
      res.status(200).json({ success: true, data: publisher });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Qualification failed';
      res.status(400).json({ success: false, error: { code: 'QUALIFY_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async setFloorPrice(req: Request, res: Response): Promise<void> {
    const publisherId = req.params['publisherId'];
    const body = req.body as { floorPrice: number };

    if (body.floorPrice === undefined) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Floor price is required', statusCode: 400 } });
      return;
    }

    try {
      const publisher = await audienceNetwork.setFloorPrice(publisherId, body.floorPrice);
      res.status(200).json({ success: true, data: publisher });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to set floor price';
      res.status(400).json({ success: false, error: { code: 'PRICE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getInventory(req: Request, res: Response): Promise<void> {
    const publisherId = req.params['publisherId'];

    try {
      const inventory = await audienceNetwork.getInventory(publisherId);
      res.status(200).json({ success: true, data: inventory });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get inventory';
      res.status(400).json({ success: false, error: { code: 'INVENTORY_FAILED', message: msg, statusCode: 400 } });
    }
  }
}

export const audienceNetworkController = new AudienceNetworkController();
