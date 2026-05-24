// ============================================================================
// QuantSync - Analytics Controller
// ============================================================================

import { analyticsService } from '../services/analytics-service';

interface Request { params: Record<string, string>; query: Record<string, string>; body: any; user?: { id: string } }
interface Response { status: (code: number) => Response; json: (data: any) => void }

export const analyticsController = {
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const range = req.query.range || '30d';
      const overview = await analyticsService.getOverview(userId, range);
      res.status(200).json(overview);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const range = req.query.range || '30d';
      const result = await analyticsService.getDailyMetrics(userId, range);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getTopPosts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const range = req.query.range || '30d';
      const limit = parseInt(req.query.limit || '10');
      const result = await analyticsService.getTopPosts(userId, range, limit);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getDemographics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const demographics = await analyticsService.getDemographics(userId);
      res.status(200).json(demographics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getHeatmap(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const range = req.query.range || '30d';
      const result = await analyticsService.getPostingHeatmap(userId, range);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getPostAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const analytics = await analyticsService.getPostAnalytics(req.params.id);
      if (!analytics) { res.status(404).json({ error: 'No analytics found' }); return; }
      res.status(200).json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async trackImpression(req: Request, res: Response): Promise<void> {
    try {
      await analyticsService.trackImpression(req.body);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async trackEngagement(req: Request, res: Response): Promise<void> {
    try {
      await analyticsService.trackEngagement(req.body);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
};
