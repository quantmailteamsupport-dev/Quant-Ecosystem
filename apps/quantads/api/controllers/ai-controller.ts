// ============================================================================
// QuantAds - AI Controller
// AI ad optimization, creative generation, audience prediction
// ============================================================================

import type { Request, Response } from '../middleware';
import { aiService } from '../services/ai-service';

class AIController {
  async predictPerformance(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaign: any; daysAhead?: number };
    if (!body.campaign) {
      res.status(400).json({ success: false, error: { code: 'MISSING_CAMPAIGN', message: 'Campaign data is required', statusCode: 400 } });
      return;
    }
    const prediction = aiService.predictPerformance(body.campaign, body.daysAhead);
    res.status(200).json({ success: true, data: prediction });
  }

  async recommendBudget(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaign: any; objective?: string };
    if (!body.campaign) {
      res.status(400).json({ success: false, error: { code: 'MISSING_CAMPAIGN', message: 'Campaign data is required', statusCode: 400 } });
      return;
    }
    const recommendation = aiService.recommendBudget(body.campaign, body.objective || body.campaign.objective);
    res.status(200).json({ success: true, data: recommendation });
  }

  async generateCreativeSuggestions(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaign: any; count?: number };
    if (!body.campaign) {
      res.status(400).json({ success: false, error: { code: 'MISSING_CAMPAIGN', message: 'Campaign data is required', statusCode: 400 } });
      return;
    }
    const suggestions = aiService.generateCreativeSuggestions(body.campaign, body.count);
    res.status(200).json({ success: true, data: suggestions });
  }

  async predictAudienceExpansion(req: Request, res: Response): Promise<void> {
    const body = req.body as { targeting: any };
    if (!body.targeting) {
      res.status(400).json({ success: false, error: { code: 'MISSING_TARGETING', message: 'Targeting config is required', statusCode: 400 } });
      return;
    }
    const expansion = aiService.predictAudienceExpansion(body.targeting);
    res.status(200).json({ success: true, data: expansion });
  }

  async suggestBidAdjustment(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaign: any };
    if (!body.campaign) {
      res.status(400).json({ success: false, error: { code: 'MISSING_CAMPAIGN', message: 'Campaign data is required', statusCode: 400 } });
      return;
    }
    const suggestion = aiService.suggestBidAdjustment(body.campaign);
    res.status(200).json({ success: true, data: suggestion });
  }
}

export const aiController = new AIController();
export default AIController;
