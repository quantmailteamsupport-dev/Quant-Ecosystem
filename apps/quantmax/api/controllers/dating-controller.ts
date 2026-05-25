// ============================================================================
// QuantMax - Dating Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { datingVerificationService } from '../services/dating-verification-service';
import { datingAIService } from '../services/dating-ai-service';
import { premiumFeaturesService } from '../services/premium-features-service';

class DatingController {
  async submitVerification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, videoData } = req.body as { userId: string; videoData: string };
      if (!userId || !videoData) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId and videoData required' } }); return; }
      const result = await datingVerificationService.submitVideo(userId, videoData);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'VERIFY_ERROR', message: error.message } }); }
  }

  async getBadge(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params as { userId: string };
      const badge = await datingVerificationService.getBadge(userId);
      res.status(200).json({ success: true, data: badge });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async getTrustScore(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params as { userId: string };
      const score = await datingVerificationService.scoreTrust(userId);
      res.status(200).json({ success: true, data: score });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async suggestIcebreaker(req: Request, res: Response): Promise<void> {
    try {
      const { userId, matchProfile, sharedInterests } = req.body as any;
      const suggestions = await datingAIService.suggestIcebreaker({ userId, matchProfile: matchProfile || { id: '', interests: [], personality: [], communication_style: '', values: [], dealbreakers: [], love_language: '' }, sharedInterests: sharedInterests || [] });
      res.status(200).json({ success: true, data: suggestions });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'AI_ERROR', message: error.message } }); }
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const { userId, plan } = req.body as { userId: string; plan: any };
      if (!userId || !plan) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId and plan required' } }); return; }
      const sub = await premiumFeaturesService.subscribe(userId, plan);
      res.status(201).json({ success: true, data: sub });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'SUBSCRIBE_ERROR', message: error.message } }); }
  }

  async boost(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body as { userId: string };
      const result = await premiumFeaturesService.boost(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'BOOST_ERROR', message: error.message } }); }
  }

  async superLike(req: Request, res: Response): Promise<void> {
    try {
      const { userId, targetUserId, message } = req.body as any;
      const result = await premiumFeaturesService.superLike(userId, targetUserId, message);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'SUPER_LIKE_ERROR', message: error.message } }); }
  }
}

export const datingController = new DatingController();
export { DatingController };
