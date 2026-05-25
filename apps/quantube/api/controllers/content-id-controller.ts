// ============================================================================
// QuantTube - Content ID Controller
// Fingerprinting, matching, claims, disputes, monetization
// ============================================================================

import type { Request, Response } from '../middleware';
import { contentIDService } from '../services/content-id-service';

class ContentIDController {
  async fingerprint(req: Request, res: Response): Promise<void> {
    try {
      const { videoId, ownerId } = req.body as { videoId: string; ownerId: string };
      if (!videoId || !ownerId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'videoId and ownerId are required' } });
        return;
      }
      const fp = await contentIDService.fingerprint(videoId, ownerId);
      res.status(201).json({ success: true, data: fp });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FINGERPRINT_ERROR', message: error.message } });
    }
  }

  async match(req: Request, res: Response): Promise<void> {
    try {
      const { fingerprintId } = req.params as { fingerprintId: string };
      if (!fingerprintId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_FINGERPRINT_ID', message: 'fingerprintId is required' } });
        return;
      }
      const matches = await contentIDService.match(fingerprintId);
      res.status(200).json({ success: true, data: { matches, count: matches.length } });
    } catch (error: any) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
  }

  async claimContent(req: Request, res: Response): Promise<void> {
    try {
      const { matchId, claimantId, action } = req.body as { matchId: string; claimantId: string; action: 'monetize' | 'block' | 'track' };
      if (!matchId || !claimantId || !action) {
        res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'matchId, claimantId, and action are required' } });
        return;
      }
      const claim = await contentIDService.claimContent(matchId, claimantId, action);
      res.status(201).json({ success: true, data: claim });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'CLAIM_ERROR', message: error.message } });
    }
  }

  async resolveDispute(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params as { disputeId: string };
      const { decision } = req.body as { decision: 'upheld' | 'overturned' };
      if (!disputeId || !decision) {
        res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'disputeId and decision are required' } });
        return;
      }
      const dispute = await contentIDService.resolveDispute(disputeId, decision);
      res.status(200).json({ success: true, data: dispute });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'DISPUTE_ERROR', message: error.message } });
    }
  }

  async releaseClaim(req: Request, res: Response): Promise<void> {
    try {
      const { claimId } = req.params as { claimId: string };
      const claim = await contentIDService.releaseClaim(claimId);
      res.status(200).json({ success: true, data: claim });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'RELEASE_ERROR', message: error.message } });
    }
  }

  async getMatchHistory(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params as { videoId: string };
      const matches = await contentIDService.getMatchHistory(videoId);
      res.status(200).json({ success: true, data: matches });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }

  async monetize(req: Request, res: Response): Promise<void> {
    try {
      const { claimId } = req.params as { claimId: string };
      const { revenueShare } = req.body as { revenueShare: number };
      const claim = await contentIDService.monetize(claimId, revenueShare || 100);
      res.status(200).json({ success: true, data: claim });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'MONETIZE_ERROR', message: error.message } });
    }
  }

  async block(req: Request, res: Response): Promise<void> {
    try {
      const { claimId } = req.params as { claimId: string };
      const claim = await contentIDService.block(claimId);
      res.status(200).json({ success: true, data: claim });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'BLOCK_ERROR', message: error.message } });
    }
  }

  async getOwners(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params as { videoId: string };
      const owners = await contentIDService.getOwners(videoId);
      res.status(200).json({ success: true, data: owners });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
    }
  }
}

export const contentIDController = new ContentIDController();
export { ContentIDController };
