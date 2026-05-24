// ============================================================================
// QuantAds - Policies Controller
// Ad review, policy compliance, approval workflow
// ============================================================================

import type { Request, Response } from '../middleware';
import type { PolicyReview, PolicyStatus, PolicyViolation } from '../../src/types';

class PoliciesController {
  private reviews: Map<string, PolicyReview> = new Map();
  private policyRules = [
    { id: 'misleading_claims', name: 'No Misleading Claims', severity: 'major' as const },
    { id: 'prohibited_content', name: 'Prohibited Content', severity: 'critical' as const },
    { id: 'landing_page', name: 'Landing Page Compliance', severity: 'minor' as const },
    { id: 'text_overlay', name: 'Text Overlay Limit', severity: 'warning' as const },
    { id: 'targeting_restrictions', name: 'Targeting Restrictions', severity: 'major' as const },
  ];

  async submitForReview(req: Request, res: Response): Promise<void> {
    const body = req.body as { creativeId: string; campaignId: string };
    if (!body.creativeId || !body.campaignId) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'creativeId and campaignId are required', statusCode: 400 } });
      return;
    }

    const review: PolicyReview = {
      id: `review_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      creativeId: body.creativeId,
      campaignId: body.campaignId,
      status: 'pending',
      violations: [],
      submittedAt: new Date().toISOString(),
    };

    this.reviews.set(review.id, review);
    res.status(201).json({ success: true, data: review });
  }

  async getReview(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const review = this.reviews.get(id);
    if (!review) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: review });
  }

  async approveReview(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const review = this.reviews.get(id);
    if (!review) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found', statusCode: 404 } }); return; }

    review.status = 'approved';
    review.reviewerId = req.userId;
    review.reviewedAt = new Date().toISOString();
    res.status(200).json({ success: true, data: review });
  }

  async rejectReview(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const body = req.body as { violations: PolicyViolation[]; notes?: string };
    const review = this.reviews.get(id);
    if (!review) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found', statusCode: 404 } }); return; }

    review.status = 'rejected';
    review.violations = body.violations || [];
    review.notes = body.notes;
    review.reviewerId = req.userId;
    review.reviewedAt = new Date().toISOString();
    res.status(200).json({ success: true, data: review });
  }

  async getPolicies(req: Request, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: { rules: this.policyRules } });
  }

  async getPendingReviews(req: Request, res: Response): Promise<void> {
    const pending = Array.from(this.reviews.values()).filter(r => r.status === 'pending');
    res.status(200).json({ success: true, data: pending });
  }
}

export const policiesController = new PoliciesController();
export default PoliciesController;
