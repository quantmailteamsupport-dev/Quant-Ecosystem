// ============================================================================
// QuantTube - Video Analytics Controller
// Retention, traffic sources, demographics, revenue, watch time, real-time
// ============================================================================

import type { Request, Response } from '../middleware';
import { videoAnalytics } from '../services/video-analytics-service';

class VideoAnalyticsController {
  async getRetentionGraph(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params as { videoId: string };
      if (!videoId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_VIDEO_ID', message: 'videoId is required' } });
        return;
      }
      const data = await videoAnalytics.getRetentionGraph(videoId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async getTrafficSources(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params as { channelId: string };
      const { videoId, startDate, endDate } = req.query as { videoId?: string; startDate?: string; endDate?: string };
      if (!channelId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_CHANNEL_ID', message: 'channelId is required' } });
        return;
      }
      const data = await videoAnalytics.getTrafficSources({ channelId, videoId, startDate, endDate });
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async getDemographics(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params as { channelId: string };
      if (!channelId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_CHANNEL_ID', message: 'channelId is required' } });
        return;
      }
      const data = await videoAnalytics.getDemographics({ channelId });
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async getRevenueMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params as { channelId: string };
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      if (!channelId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_CHANNEL_ID', message: 'channelId is required' } });
        return;
      }
      const data = await videoAnalytics.getRevenueMetrics({ channelId, startDate, endDate });
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async getWatchTime(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params as { channelId: string };
      if (!channelId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_CHANNEL_ID', message: 'channelId is required' } });
        return;
      }
      const data = await videoAnalytics.getWatchTime({ channelId });
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async getRealTimeViews(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params as { channelId: string };
      if (!channelId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_CHANNEL_ID', message: 'channelId is required' } });
        return;
      }
      const data = await videoAnalytics.getRealTimeViews(channelId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async getEngagement(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params as { videoId: string };
      if (!videoId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_VIDEO_ID', message: 'videoId is required' } });
        return;
      }
      const data = await videoAnalytics.getEngagementMetrics(videoId);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }
}

export const videoAnalyticsController = new VideoAnalyticsController();
export { VideoAnalyticsController };
