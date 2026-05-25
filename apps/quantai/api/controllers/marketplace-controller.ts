// ============================================================================
// QuantAI - Marketplace Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { aiMarketplaceService } from '../services/ai-marketplace-service';

class MarketplaceController {
  async listPersonas(req: Request, res: Response): Promise<void> {
    try {
      const { category, sort, limit, offset } = req.query as any;
      const result = await aiMarketplaceService.listPersonas(category, { sort, limit: Number(limit), offset: Number(offset) });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async searchPersonas(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query as { query?: string };
      if (!query) { res.status(400).json({ success: false, error: { code: 'MISSING_QUERY', message: 'query parameter required' } }); return; }
      const results = await aiMarketplaceService.searchPersonas(query);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async createPersona(req: Request, res: Response): Promise<void> {
    try {
      const { creatorId, ...config } = req.body as any;
      if (!creatorId || !config.name) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'creatorId and name required' } }); return; }
      const persona = await aiMarketplaceService.createPersona(creatorId, config);
      res.status(201).json({ success: true, data: persona });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } }); }
  }

  async publishPersona(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params as { personaId: string };
      const { creatorId } = req.body as { creatorId: string };
      const persona = await aiMarketplaceService.publishPersona(personaId, creatorId);
      res.status(200).json({ success: true, data: persona });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'PUBLISH_ERROR', message: error.message } }); }
  }

  async ratePersona(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params as { personaId: string };
      const { userId, rating, review } = req.body as any;
      const result = await aiMarketplaceService.rate(personaId, userId, rating, review);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'RATE_ERROR', message: error.message } }); }
  }

  async purchase(req: Request, res: Response): Promise<void> {
    try {
      const { personaId } = req.params as { personaId: string };
      const { userId } = req.body as { userId: string };
      const result = await aiMarketplaceService.purchase(personaId, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'PURCHASE_ERROR', message: error.message } }); }
  }

  async getEarnings(req: Request, res: Response): Promise<void> {
    try {
      const { creatorId } = req.params as { creatorId: string };
      const earnings = await aiMarketplaceService.getEarnings(creatorId);
      res.status(200).json({ success: true, data: earnings });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }
}

export const marketplaceController = new MarketplaceController();
export { MarketplaceController };
