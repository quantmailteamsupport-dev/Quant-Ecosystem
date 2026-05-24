// ============================================================================
// QuantAds - Analytics Controller
// Impressions, clicks, conversions, ROI, attribution, reports
// ============================================================================

import type { Request, Response } from '../middleware';
import { analyticsService } from '../services/analytics-service';

class AnalyticsController {
  async getCampaignAnalytics(req: Request, res: Response): Promise<void> {
    const campaignId = req.params['id'];
    const metrics = analyticsService.getCampaignMetrics(campaignId);
    res.status(200).json({ success: true, data: metrics });
  }

  async generateReport(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaignId: string; startDate: string; endDate: string; granularity?: 'hour' | 'day' | 'week' | 'month' };

    if (!body.campaignId || !body.startDate || !body.endDate) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'campaignId, startDate, and endDate are required', statusCode: 400 } });
      return;
    }

    const report = analyticsService.generateReport(body.campaignId, body.startDate, body.endDate, body.granularity);
    res.status(200).json({ success: true, data: report });
  }

  async getReport(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const report = analyticsService.getReport(id);
    if (!report) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: report });
  }

  async trackImpression(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaignId: string; creativeId: string; userId: string; placement: string; cost: number };
    const id = analyticsService.trackImpression(body.campaignId, body.creativeId, body.userId, body.placement, body.cost);
    res.status(200).json({ success: true, data: { impressionId: id } });
  }

  async trackClick(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaignId: string; creativeId: string; userId: string; impressionId: string };
    const id = analyticsService.trackClick(body.campaignId, body.creativeId, body.userId, body.impressionId);
    res.status(200).json({ success: true, data: { clickId: id } });
  }

  async trackConversion(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaignId: string; userId: string; revenue: number; conversionType: string };
    const id = analyticsService.trackConversion(body.campaignId, body.userId, body.revenue, body.conversionType);
    res.status(200).json({ success: true, data: { conversionId: id } });
  }

  async getRealtimeStats(req: Request, res: Response): Promise<void> {
    const campaignId = req.params['id'];
    const stats = analyticsService.getRealtimeStats(campaignId);
    res.status(200).json({ success: true, data: stats });
  }

  async exportReport(req: Request, res: Response): Promise<void> {
    const body = req.body as { campaignId: string; startDate: string; endDate: string; format: 'csv' | 'json' };
    const report = analyticsService.generateReport(body.campaignId, body.startDate, body.endDate);

    if (body.format === 'csv') {
      const csv = this.metricsToCSV(report.metrics);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } else {
      res.status(200).json({ success: true, data: report });
    }
  }

  private metricsToCSV(metrics: any): string {
    const headers = Object.keys(metrics).join(',');
    const values = Object.values(metrics).join(',');
    return `${headers}\n${values}`;
  }
}

export const analyticsController = new AnalyticsController();
export default AnalyticsController;
