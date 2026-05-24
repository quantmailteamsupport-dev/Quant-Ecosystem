// ============================================================================
// QuantAds - Targeting Controller
// Audience targeting (demographics, interests, behavior, retargeting, lookalike)
// ============================================================================

import type { Request, Response } from '../middleware';
import type { TargetingConfig, CustomAudience, LookalikeAudience } from '../../src/types';
import { targetingService } from '../services/targeting-service';

class TargetingController {
  async estimateAudience(req: Request, res: Response): Promise<void> {
    const body = req.body as TargetingConfig;
    if (!body.demographics) {
      res.status(400).json({ success: false, error: { code: 'MISSING_TARGETING', message: 'Targeting config is required', statusCode: 400 } });
      return;
    }
    const estimate = targetingService.estimateAudienceSize(body);
    res.status(200).json({ success: true, data: estimate });
  }

  async createAudience(req: Request, res: Response): Promise<void> {
    const body = req.body as { name: string; size: number; source: 'upload' | 'pixel' | 'engagement' | 'app_activity' };
    if (!body.name || !body.source) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name and source are required', statusCode: 400 } });
      return;
    }
    const audience = targetingService.createAudience(body);
    res.status(201).json({ success: true, data: audience });
  }

  async listAudiences(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const audiences = targetingService.listAudiences(userId);
    res.status(200).json({ success: true, data: audiences });
  }

  async getAudience(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const audience = targetingService.getAudience(id);
    if (!audience) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Audience not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: audience });
  }

  async deleteAudience(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const deleted = targetingService.deleteAudience(id);
    if (!deleted) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Audience not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { deleted: true } });
  }

  async createLookalikeAudience(req: Request, res: Response): Promise<void> {
    const body = req.body as LookalikeAudience;
    if (!body.sourceAudienceId || !body.size || !body.country) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'sourceAudienceId, size, and country are required', statusCode: 400 } });
      return;
    }
    const audience = targetingService.createLookalikeAudience(body);
    res.status(201).json({ success: true, data: audience });
  }

  async getInterestCategories(req: Request, res: Response): Promise<void> {
    const categories = [
      { id: 'tech', name: 'Technology', subcategories: ['AI/ML', 'Web Development', 'Mobile Apps', 'Cybersecurity', 'Cloud Computing'] },
      { id: 'gaming', name: 'Gaming', subcategories: ['PC Gaming', 'Console', 'Mobile Games', 'Esports', 'VR/AR'] },
      { id: 'sports', name: 'Sports', subcategories: ['Football', 'Basketball', 'Soccer', 'Tennis', 'Fitness'] },
      { id: 'entertainment', name: 'Entertainment', subcategories: ['Movies', 'TV Shows', 'Music', 'Podcasts', 'Live Events'] },
      { id: 'lifestyle', name: 'Lifestyle', subcategories: ['Food', 'Travel', 'Fashion', 'Home Decor', 'Wellness'] },
      { id: 'business', name: 'Business', subcategories: ['Startups', 'Marketing', 'Finance', 'Investing', 'E-commerce'] },
    ];
    res.status(200).json({ success: true, data: categories });
  }

  async getBehaviorCategories(req: Request, res: Response): Promise<void> {
    const behaviors = [
      { id: 'purchase', name: 'Purchase Behavior', items: ['Online Shopper', 'In-App Purchaser', 'Subscription User', 'Impulse Buyer'] },
      { id: 'engagement', name: 'Engagement', items: ['Power User', 'Content Creator', 'Active Commenter', 'Social Sharer'] },
      { id: 'device', name: 'Device Usage', items: ['Multi-Device User', 'Mobile Primary', 'New Device Owner', 'Heavy App User'] },
      { id: 'travel', name: 'Travel', items: ['Frequent Traveler', 'Business Traveler', 'International Traveler'] },
    ];
    res.status(200).json({ success: true, data: behaviors });
  }
}

export const targetingController = new TargetingController();
export default TargetingController;
