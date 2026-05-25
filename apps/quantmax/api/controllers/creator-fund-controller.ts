// ============================================================================
// QuantMax - Creator Fund Controller
// Methods: checkEligibility, getEarnings, getPayouts, enroll, getAnalytics
// ============================================================================

import { creatorFundService } from '../services/creator-fund-service';

interface Request {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  user?: { id: string; displayName: string; followers?: number; monthlyViews?: number; accountAgeDays?: number; violations?: number };
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class CreatorFundController {
  // GET /api/creator-fund/eligibility - Check eligibility
  async checkEligibility(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const followers = req.user?.followers || 0;
      const monthlyViews = req.user?.monthlyViews || 0;
      const accountAgeDays = req.user?.accountAgeDays || 0;
      const violations = req.user?.violations || 0;

      const eligibility = creatorFundService.checkEligibility(userId, {
        followers,
        monthlyViews,
        accountAgeDays,
        violations,
      });

      res.status(200).json({
        success: true,
        data: {
          eligible: eligibility.eligible,
          requirements: eligibility.requirements,
          enrolledStatus: creatorFundService.getCreator(userId) !== null,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to check eligibility', detail: error.message });
    }
  }

  // GET /api/creator-fund/earnings - Get earnings
  async getEarnings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const creator = creatorFundService.getCreator(userId);
      if (!creator) {
        res.status(403).json({ success: false, error: 'Not enrolled in creator fund' });
        return;
      }

      const days = parseInt(req.query.days || '30', 10);
      const earnings = creatorFundService.getEarningsHistory(userId, days);
      const totalEarnings = earnings.reduce((sum, e) => sum + e.totalRevenue, 0);

      res.status(200).json({
        success: true,
        data: {
          earnings,
          summary: {
            total: Math.round(totalEarnings * 100) / 100,
            days,
            averageDaily: earnings.length > 0 ? Math.round((totalEarnings / earnings.length) * 100) / 100 : 0,
            tier: creator.tier,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to get earnings', detail: error.message });
    }
  }

  // GET /api/creator-fund/payouts - Get payouts
  async getPayouts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const creator = creatorFundService.getCreator(userId);
      if (!creator) {
        res.status(403).json({ success: false, error: 'Not enrolled in creator fund' });
        return;
      }

      const payouts = creatorFundService.getPayoutHistory(userId);
      const pending = payouts.filter(p => p.status === 'pending');
      const completed = payouts.filter(p => p.status === 'completed');
      const totalPaid = completed.reduce((sum, p) => sum + p.amount, 0);
      const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);

      res.status(200).json({
        success: true,
        data: {
          payouts,
          summary: {
            totalPaid: Math.round(totalPaid * 100) / 100,
            totalPending: Math.round(totalPending * 100) / 100,
            nextPayoutDate: pending[0]?.scheduledDate || null,
            payoutCount: payouts.length,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to get payouts', detail: error.message });
    }
  }

  // POST /api/creator-fund/enroll - Enroll in fund
  async enroll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const displayName = req.user?.displayName || 'Creator';
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      // Check if already enrolled
      const existing = creatorFundService.getCreator(userId);
      if (existing) {
        res.status(409).json({ success: false, error: 'Already enrolled in creator fund' });
        return;
      }

      // Verify eligibility
      const followers = req.user?.followers || 0;
      const monthlyViews = req.user?.monthlyViews || 0;
      const accountAgeDays = req.user?.accountAgeDays || 0;
      const violations = req.user?.violations || 0;

      const eligibility = creatorFundService.checkEligibility(userId, {
        followers, monthlyViews, accountAgeDays, violations,
      });

      if (!eligibility.eligible) {
        res.status(403).json({
          success: false,
          error: 'Does not meet eligibility requirements',
          requirements: eligibility.requirements,
        });
        return;
      }

      const creator = creatorFundService.enrollCreator(userId, displayName, followers, monthlyViews);

      res.status(201).json({
        success: true,
        data: {
          enrolled: true,
          creator,
          message: 'Successfully enrolled in the creator fund',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to enroll', detail: error.message });
    }
  }

  // GET /api/creator-fund/analytics - Get analytics
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const creator = creatorFundService.getCreator(userId);
      if (!creator) {
        res.status(403).json({ success: false, error: 'Not enrolled in creator fund' });
        return;
      }

      const analytics = creatorFundService.getAnalytics(userId);

      res.status(200).json({
        success: true,
        data: {
          analytics,
          creator: {
            tier: creator.tier,
            enrolledAt: creator.enrolledAt,
            isSuspended: creator.isSuspended,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to get analytics', detail: error.message });
    }
  }
}

export default CreatorFundController;
