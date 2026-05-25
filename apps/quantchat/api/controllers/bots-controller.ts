// ============================================================================
// QuantChat API - Bots Controller
// Bot marketplace discovery, installation, management
// ============================================================================

import type { Request, Response } from '../middleware';
import { botMarketplace } from '../services/bot-marketplace-service';

export class BotsController {
  async listBots(req: Request, res: Response): Promise<void> {
    const category = req.query['category'] as string | undefined;
    const sort = req.query['sort'] as 'popular' | 'newest' | 'rating' | undefined;
    const page = parseInt(req.query['page'] as string) || 1;
    const limit = parseInt(req.query['limit'] as string) || 20;

    const result = await botMarketplace.listBots(category, { page, limit, sort });
    res.status(200).json({ success: true, data: result.bots, metadata: { total: result.total, page, limit } });
  }

  async searchBots(req: Request, res: Response): Promise<void> {
    const query = req.query['q'] as string;
    if (!query) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Search query is required', statusCode: 400 } });
      return;
    }

    const bots = await botMarketplace.searchBots(query);
    res.status(200).json({ success: true, data: bots });
  }

  async installBot(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const botId = req.params['botId'];
    const body = req.body as { chatIds?: string[] };

    try {
      const installation = await botMarketplace.installBot(userId, botId, body.chatIds);
      res.status(201).json({ success: true, data: installation });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to install bot';
      res.status(400).json({ success: false, error: { code: 'INSTALL_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async uninstallBot(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const botId = req.params['botId'];

    try {
      await botMarketplace.uninstallBot(userId, botId);
      res.status(200).json({ success: true, data: { message: 'Bot uninstalled' } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to uninstall bot';
      res.status(400).json({ success: false, error: { code: 'UNINSTALL_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async createBot(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { name: string; description: string; category: string; commands: any[]; permissions: string[]; webhookUrl: string };

    if (!body.name || !body.description || !body.webhookUrl) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Name, description, and webhook URL are required', statusCode: 400 } });
      return;
    }

    try {
      const bot = await botMarketplace.createBot(userId, body);
      res.status(201).json({ success: true, data: bot });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create bot';
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async publishBot(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const botId = req.params['botId'];

    try {
      const bot = await botMarketplace.publishBot(botId, userId);
      res.status(200).json({ success: true, data: bot });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to publish bot';
      res.status(400).json({ success: false, error: { code: 'PUBLISH_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getBotAnalytics(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const botId = req.params['botId'];

    try {
      const analytics = await botMarketplace.getBotAnalytics(botId, userId);
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to get analytics';
      res.status(400).json({ success: false, error: { code: 'ANALYTICS_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async rateBot(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const botId = req.params['botId'];
    const body = req.body as { rating: number };

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Rating must be between 1 and 5', statusCode: 400 } });
      return;
    }

    try {
      const bot = await botMarketplace.rateBot(userId, botId, body.rating);
      res.status(200).json({ success: true, data: bot });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to rate bot';
      res.status(400).json({ success: false, error: { code: 'RATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getPopular(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query['limit'] as string) || 10;
    const bots = await botMarketplace.getPopular(limit);
    res.status(200).json({ success: true, data: bots });
  }
}

export const botsController = new BotsController();
