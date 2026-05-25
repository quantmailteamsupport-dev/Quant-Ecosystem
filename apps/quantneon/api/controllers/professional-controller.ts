// ============================================================================
// QuantNeon - Professional Dashboard Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { professionalDashboardService } from '../services/professional-dashboard-service';

class ProfessionalController {
  async getInsights(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params as { accountId: string };
      const { timeRange } = req.query as { timeRange?: string };
      const data = await professionalDashboardService.getInsights(accountId, timeRange || '7d');
      res.status(200).json({ success: true, data });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async getReach(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params as { accountId: string };
      const { timeRange } = req.query as { timeRange?: string };
      const data = await professionalDashboardService.getReach(accountId, timeRange || '7d');
      res.status(200).json({ success: true, data });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async getDemographics(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params as { accountId: string };
      const data = await professionalDashboardService.getFollowerDemographics(accountId);
      res.status(200).json({ success: true, data });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async getContentPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params as { accountId: string };
      const { timeRange } = req.query as { timeRange?: string };
      const data = await professionalDashboardService.getContentPerformance(accountId, timeRange || '30d');
      res.status(200).json({ success: true, data });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async getTopPosts(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params as { accountId: string };
      const { limit } = req.query as { limit?: string };
      const data = await professionalDashboardService.getTopPosts(accountId, Number(limit) || 10);
      res.status(200).json({ success: true, data });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async getContactActions(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params as { accountId: string };
      const data = await professionalDashboardService.getContactActions(accountId);
      res.status(200).json({ success: true, data });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }
}

export const professionalController = new ProfessionalController();
export { ProfessionalController };
