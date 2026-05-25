// ============================================================================
// QuantNeon - Reels Remix Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { reelsRemixService } from '../services/reels-remix-service';

class ReelsRemixController {
  async createRemix(req: Request, res: Response): Promise<void> {
    try {
      const { originalReelId, userId } = req.body as { originalReelId: string; userId: string };
      if (!originalReelId || !userId) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'originalReelId and userId required' } }); return; }
      const remix = await reelsRemixService.createRemix(originalReelId, userId);
      res.status(201).json({ success: true, data: remix });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } }); }
  }

  async setLayout(req: Request, res: Response): Promise<void> {
    try {
      const { remixId } = req.params as { remixId: string };
      const { layout } = req.body as { layout: any };
      const remix = await reelsRemixService.setLayout(remixId, layout);
      res.status(200).json({ success: true, data: remix });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'LAYOUT_ERROR', message: error.message } }); }
  }

  async addVideo(req: Request, res: Response): Promise<void> {
    try {
      const { remixId } = req.params as { remixId: string };
      const { videoUrl, duration } = req.body as { videoUrl: string; duration: number };
      const remix = await reelsRemixService.addOwnVideo(remixId, videoUrl, duration);
      res.status(200).json({ success: true, data: remix });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'VIDEO_ERROR', message: error.message } }); }
  }

  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { remixId } = req.params as { remixId: string };
      const remix = await reelsRemixService.publish(remixId);
      res.status(200).json({ success: true, data: remix });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'PUBLISH_ERROR', message: error.message } }); }
  }

  async getRemixes(req: Request, res: Response): Promise<void> {
    try {
      const { reelId } = req.params as { reelId: string };
      const { limit, offset, sort } = req.query as any;
      const result = await reelsRemixService.getRemixes(reelId, { limit: Number(limit), offset: Number(offset), sort });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async disableRemix(req: Request, res: Response): Promise<void> {
    try {
      const { reelId } = req.params as { reelId: string };
      const { creatorId } = req.body as { creatorId: string };
      const settings = await reelsRemixService.disableRemix(reelId, creatorId);
      res.status(200).json({ success: true, data: settings });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'DISABLE_ERROR', message: error.message } }); }
  }
}

export const reelsRemixController = new ReelsRemixController();
export { ReelsRemixController };
