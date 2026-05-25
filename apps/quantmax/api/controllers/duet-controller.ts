// ============================================================================
// QuantMax - Duet Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { duetStitchService } from '../services/duet-stitch-service';

class DuetController {
  async createDuet(req: Request, res: Response): Promise<void> {
    try {
      const { originalVideoId, creatorId, layout } = req.body as any;
      if (!originalVideoId || !creatorId) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'originalVideoId and creatorId required' } }); return; }
      const duet = await duetStitchService.createDuet(originalVideoId, creatorId, layout);
      res.status(201).json({ success: true, data: duet });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } }); }
  }

  async createStitch(req: Request, res: Response): Promise<void> {
    try {
      const { originalVideoId, creatorId, clipDuration, startTime, transitionType } = req.body as any;
      const stitch = await duetStitchService.createStitch(originalVideoId, creatorId, { originalVideoId, clipDuration: clipDuration || 3, startTime: startTime || 0, transitionType: transitionType || 'cut' });
      res.status(201).json({ success: true, data: stitch });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'STITCH_ERROR', message: error.message } }); }
  }

  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { duetId } = req.params as { duetId: string };
      const { videoUrl, duration } = req.body as { videoUrl: string; duration: number };
      const duet = await duetStitchService.publish(duetId, videoUrl, duration);
      res.status(200).json({ success: true, data: duet });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'PUBLISH_ERROR', message: error.message } }); }
  }

  async getReactions(req: Request, res: Response): Promise<void> {
    try {
      const { duetId } = req.params as { duetId: string };
      const reactions = await duetStitchService.getReactions(duetId);
      res.status(200).json({ success: true, data: reactions });
    } catch (error: any) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } }); }
  }

  async disableDuet(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params as { videoId: string };
      const { creatorId } = req.body as { creatorId: string };
      const settings = await duetStitchService.disableDuet(videoId, creatorId);
      res.status(200).json({ success: true, data: settings });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'DISABLE_ERROR', message: error.message } }); }
  }
}

export const duetController = new DuetController();
export { DuetController };
