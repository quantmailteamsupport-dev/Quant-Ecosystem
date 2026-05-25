// ============================================================================
// QuantEdits - AI Editing Controller
// Background removal, style transfer, motion tracking, beat sync
// ============================================================================

import type { Request, Response } from '../middleware';
import { aiBackgroundService } from '../services/ai-background-service';
import { styleTransferService } from '../services/style-transfer-service';
import { motionTrackingService } from '../services/motion-tracking-service';
import { beatSyncService } from '../services/beat-sync-service';

class AIEditingController {
  async detectBackground(req: Request, res: Response): Promise<void> {
    try {
      const { imageData } = req.body as { imageData: string };
      if (!imageData) { res.status(400).json({ success: false, error: { code: 'MISSING_DATA', message: 'imageData required' } }); return; }
      const result = await aiBackgroundService.detect(imageData);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'DETECT_ERROR', message: error.message } }); }
  }

  async replaceBackground(req: Request, res: Response): Promise<void> {
    try {
      const { imageId, newBackgroundUrl } = req.body as { imageId: string; newBackgroundUrl: string };
      if (!imageId || !newBackgroundUrl) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'imageId and newBackgroundUrl required' } }); return; }
      const result = await aiBackgroundService.replace(imageId, newBackgroundUrl);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'REPLACE_ERROR', message: error.message } }); }
  }

  async blurBackground(req: Request, res: Response): Promise<void> {
    try {
      const { imageId, intensity, type } = req.body as any;
      const result = await aiBackgroundService.blur(imageId, { intensity, type });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'BLUR_ERROR', message: error.message } }); }
  }

  async applyStyle(req: Request, res: Response): Promise<void> {
    try {
      const { mediaId, styleId, intensity, quality } = req.body as any;
      if (!mediaId || !styleId) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'mediaId and styleId required' } }); return; }
      const result = await styleTransferService.applyStyle(mediaId, styleId, { intensity, quality });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'STYLE_ERROR', message: error.message } }); }
  }

  async listStyles(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query as { category?: any };
      const styles = await styleTransferService.listStyles(category);
      res.status(200).json({ success: true, data: styles });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async trackObject(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, objectBounds, name, algorithm } = req.body as any;
      if (!videoId || !objectBounds) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'videoId and objectBounds required' } }); return; }
      const result = await motionTrackingService.trackObject(videoId, objectBounds, { name, algorithm });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'TRACK_ERROR', message: error.message } }); }
  }

  async detectBeats(req: Request, res: Response): Promise<void> {
    try {
      const { audioTrackId, sensitivity, minBpm, maxBpm } = req.body as any;
      if (!audioTrackId) { res.status(400).json({ success: false, error: { code: 'MISSING_TRACK', message: 'audioTrackId required' } }); return; }
      const result = await beatSyncService.detectBeats(audioTrackId, { sensitivity, minBpm, maxBpm });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'BEAT_ERROR', message: error.message } }); }
  }

  async autoSyncCuts(req: Request, res: Response): Promise<void> {
    try {
      const { videoClips, analysisId } = req.body as any;
      if (!videoClips || !analysisId) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'videoClips and analysisId required' } }); return; }
      const result = await beatSyncService.autoSyncCuts(videoClips, analysisId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'SYNC_ERROR', message: error.message } }); }
  }

  async getPresets(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query as { category?: any };
      const presets = await aiBackgroundService.getPresets(category);
      res.status(200).json({ success: true, data: presets });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }
}

export const aiEditingController = new AIEditingController();
export { AIEditingController };
