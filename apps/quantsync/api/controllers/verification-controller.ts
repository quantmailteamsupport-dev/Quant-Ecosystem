// ============================================================================
// QuantSync - Verification Controller
// ============================================================================

import { verificationService } from '../services/verification-service';

interface Request { params: Record<string, string>; query: Record<string, string>; body: any; user?: { id: string } }
interface Response { status: (code: number) => Response; json: (data: any) => void }

export const verificationController = {
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const status = await verificationService.getStatus(userId);
      res.status(200).json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getEligibility(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const mockProfile = { followers: 1500, posts: 80, accountAgeDays: 120, emailVerified: true, phoneVerified: true, profileComplete: true, violationsCount: 0 };
      const eligibility = await verificationService.checkEligibility(userId, mockProfile);
      res.status(200).json(eligibility);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getRequirements(req: Request, res: Response): Promise<void> {
    try {
      const requirements = await verificationService.getRequirements();
      res.status(200).json(requirements);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async apply(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { badgeType, category, reason, links } = req.body;
      if (!badgeType || !reason) { res.status(400).json({ error: 'Badge type and reason are required' }); return; }
      const application = await verificationService.submitApplication(userId, { badgeType, category: category || 'other', reason, links: links || [] });
      res.status(201).json(application);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getPendingApplications(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit || '50');
      const applications = await verificationService.getPendingApplications(limit);
      res.status(200).json({ applications });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async reviewApplication(req: Request, res: Response): Promise<void> {
    try {
      const reviewerId = req.user?.id || 'admin';
      const { approved, notes, rejectionReason } = req.body;
      const application = await verificationService.reviewApplication(req.params.id, reviewerId, { approved, notes, rejectionReason });
      res.status(200).json(application);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async revokeBadge(req: Request, res: Response): Promise<void> {
    try {
      const revokedBy = req.user?.id || 'admin';
      const { reason } = req.body;
      await verificationService.revokeBadge(req.params.userId, reason || 'Policy violation', revokedBy);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
};
