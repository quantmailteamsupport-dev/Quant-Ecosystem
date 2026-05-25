// ============================================================================
// QuantAds API - ML Bidding Controller
// ML bid optimization, model training, predictions, A/B testing
// ============================================================================

import type { Request, Response } from '../middleware';
import { mlBiddingService } from '../services/ml-bidding-service';

export class MLBiddingController {
  async optimizeBid(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaign: { id: string; budget: number; targetCPA: number; maxBid: number }; context: any };

    if (!body.campaign || !body.context) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Campaign and context are required', statusCode: 400 } });
      return;
    }

    try {
      const prediction = await mlBiddingService.optimizeBid(body.campaign, body.context);
      res.status(200).json({ success: true, data: prediction });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Bid optimization failed';
      res.status(400).json({ success: false, error: { code: 'OPTIMIZE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async trainModel(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaignId: string; historicalData: any[] };

    if (!body.campaignId || !body.historicalData) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Campaign ID and historical data are required', statusCode: 400 } });
      return;
    }

    try {
      const metrics = await mlBiddingService.trainModel(body.campaignId, body.historicalData);
      res.status(200).json({ success: true, data: metrics });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Model training failed';
      res.status(400).json({ success: false, error: { code: 'TRAIN_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getPrediction(req: Request, res: Response): Promise<void> {
    const campaignId = req.params['campaignId'];
    const body = req.body as { contexts: any[] };

    if (!body.contexts || body.contexts.length === 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Contexts array is required', statusCode: 400 } });
      return;
    }

    try {
      const predictions = await mlBiddingService.getPrediction(campaignId, body.contexts);
      res.status(200).json({ success: true, data: predictions });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Prediction failed';
      res.status(400).json({ success: false, error: { code: 'PREDICT_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getFeatureImportance(req: Request, res: Response): Promise<void> {
    const campaignId = req.params['campaignId'];

    try {
      const features = await mlBiddingService.getFeatureImportance(campaignId);
      res.status(200).json({ success: true, data: features });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get feature importance';
      res.status(400).json({ success: false, error: { code: 'FEATURE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async evaluateModel(req: Request, res: Response): Promise<void> {
    const campaignId = req.params['campaignId'];

    try {
      const result = await mlBiddingService.evaluateModel(campaignId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Model evaluation failed';
      res.status(400).json({ success: false, error: { code: 'EVALUATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async createABTest(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaignId: string; controlStrategy: string; testStrategy: string; trafficSplit: number };

    if (!body.campaignId || !body.controlStrategy || !body.testStrategy) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Campaign, control and test strategies are required', statusCode: 400 } });
      return;
    }

    try {
      const test = await mlBiddingService.abTestStrategy(body.campaignId, body);
      res.status(201).json({ success: true, data: test });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AB test creation failed';
      res.status(400).json({ success: false, error: { code: 'ABTEST_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async adjustBidFloor(req: Request, res: Response): Promise<void> {
    const body = req.body as { placementId: string; floor: number };

    if (!body.placementId || body.floor === undefined) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Placement ID and floor are required', statusCode: 400 } });
      return;
    }

    try {
      const result = await mlBiddingService.adjustBidFloor(body.placementId, body.floor);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Bid floor adjustment failed';
      res.status(400).json({ success: false, error: { code: 'FLOOR_FAILED', message: msg, statusCode: 400 } });
    }
  }
}

export const mlBiddingController = new MLBiddingController();
