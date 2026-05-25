// ============================================================================
// QuantSync API - Scheduling Controller
// Post scheduling, queue management, optimal times
// ============================================================================

import type { Request, Response } from '../middleware';
import { schedulingService } from '../services/scheduling-service';

export class SchedulingController {
  async schedulePost(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { content: string; scheduledAt: string; mediaUrls?: string[]; hashtags?: string[]; timezone?: string };

    if (!body.content || !body.scheduledAt) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Content and scheduled time are required', statusCode: 400 } });
      return;
    }

    try {
      const post = await schedulingService.schedulePost(userId, {
        ...body,
        scheduledAt: new Date(body.scheduledAt),
      });
      res.status(201).json({ success: true, data: post });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to schedule post';
      res.status(400).json({ success: false, error: { code: 'SCHEDULE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async cancelScheduled(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const postId = req.params['postId'];

    try {
      const post = await schedulingService.cancelScheduled(postId, userId);
      res.status(200).json({ success: true, data: post });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to cancel';
      res.status(400).json({ success: false, error: { code: 'CANCEL_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async reschedule(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const postId = req.params['postId'];
    const body = req.body as { newTime: string };

    if (!body.newTime) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'New time is required', statusCode: 400 } });
      return;
    }

    try {
      const post = await schedulingService.reschedule(postId, userId, new Date(body.newTime));
      res.status(200).json({ success: true, data: post });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to reschedule';
      res.status(400).json({ success: false, error: { code: 'RESCHEDULE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getQueue(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const queue = await schedulingService.getQueue(userId);
    res.status(200).json({ success: true, data: queue, metadata: { count: queue.length } });
  }

  async getOptimalTimes(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const times = await schedulingService.getOptimalTimes(userId);
    res.status(200).json({ success: true, data: times });
  }

  async getAnalytics(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const analytics = await schedulingService.getAnalyticsForScheduled(userId);
    res.status(200).json({ success: true, data: analytics });
  }
}

export const schedulingController = new SchedulingController();
