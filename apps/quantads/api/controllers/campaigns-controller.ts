// ============================================================================
// QuantAds - Campaigns Controller
// Create/manage campaigns, budgets, scheduling, A/B testing
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Campaign, CampaignStatus, CampaignObjective, Budget, Schedule, ABTest } from '../../src/types';
import { auctionService } from '../services/auction-service';
import { analyticsService } from '../services/analytics-service';

class CampaignsController {
  private campaigns: Map<string, Campaign> = new Map();
  private abTests: Map<string, ABTest> = new Map();

  async createCampaign(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as {
      name: string;
      objective: CampaignObjective;
      budget: Omit<Budget, 'spent' | 'remaining'>;
      schedule: Schedule;
      targeting?: any;
      placements?: any[];
    };

    if (!body.name || !body.objective || !body.budget || !body.schedule) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'name, objective, budget, and schedule are required', statusCode: 400 } });
      return;
    }

    const campaign: Campaign = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      advertiserId: userId,
      name: body.name,
      objective: body.objective,
      status: 'draft',
      budget: {
        ...body.budget,
        spent: 0,
        remaining: body.budget.amount,
      },
      schedule: body.schedule,
      targeting: body.targeting || {
        demographics: { ageMin: 18, ageMax: 65, genders: ['all'], languages: ['en'], educationLevels: [], incomeRanges: [] },
        interests: [],
        behaviors: [],
        locations: [],
        devices: { platforms: ['ios', 'android', 'web', 'desktop'], osVersions: [], deviceTypes: ['mobile', 'tablet', 'desktop'], connectionTypes: ['all'] },
        custom: [],
        exclusions: [],
      },
      creatives: [],
      placements: body.placements || [],
      abTests: [],
      metrics: { impressions: 0, clicks: 0, ctr: 0, conversions: 0, conversionRate: 0, spend: 0, cpm: 0, cpc: 0, cpa: 0, roas: 0, reach: 0, frequency: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.campaigns.set(campaign.id, campaign);
    res.status(201).json({ success: true, data: campaign });
  }

  async getCampaign(req: Request, res: Response): Promise<void> {
    const campaignId = req.params['id'];
    const campaign = this.campaigns.get(campaignId);

    if (!campaign) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found', statusCode: 404 } });
      return;
    }

    // Attach live metrics
    campaign.metrics = analyticsService.getCampaignMetrics(campaignId);

    res.status(200).json({ success: true, data: campaign });
  }

  async listCampaigns(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;
    const status = query['status'] as CampaignStatus | undefined;
    const limit = Math.min(parseInt(query['limit'] || '20', 10), 50);
    const offset = parseInt(query['offset'] || '0', 10);

    let campaigns = Array.from(this.campaigns.values()).filter(c => c.advertiserId === userId);
    if (status) campaigns = campaigns.filter(c => c.status === status);
    campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const paginated = campaigns.slice(offset, offset + limit);
    res.status(200).json({ success: true, data: paginated, meta: { total: campaigns.length, limit, offset } });
  }

  async updateCampaign(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const campaignId = req.params['id'];
    const body = req.body as Partial<Campaign>;

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found', statusCode: 404 } }); return; }
    if (campaign.advertiserId !== userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your campaign', statusCode: 403 } }); return; }

    if (body.name) campaign.name = body.name;
    if (body.budget) campaign.budget = { ...campaign.budget, ...body.budget };
    if (body.schedule) campaign.schedule = body.schedule;
    if (body.targeting) campaign.targeting = body.targeting;
    if (body.placements) campaign.placements = body.placements;
    campaign.updatedAt = new Date().toISOString();

    // Update in auction engine if active
    if (campaign.status === 'active') auctionService.updateCampaign(campaign);

    res.status(200).json({ success: true, data: campaign });
  }

  async updateCampaignStatus(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const campaignId = req.params['id'];
    const body = req.body as { status: CampaignStatus };

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found', statusCode: 404 } }); return; }
    if (campaign.advertiserId !== userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your campaign', statusCode: 403 } }); return; }

    const validTransitions: Record<string, string[]> = {
      draft: ['pending_review'],
      pending_review: ['active', 'rejected'],
      active: ['paused', 'completed'],
      paused: ['active', 'completed'],
      rejected: ['draft'],
    };

    if (!validTransitions[campaign.status]?.includes(body.status)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: `Cannot transition from ${campaign.status} to ${body.status}`, statusCode: 400 } });
      return;
    }

    campaign.status = body.status;
    campaign.updatedAt = new Date().toISOString();

    if (body.status === 'active') {
      auctionService.registerCampaign(campaign);
    } else if (body.status === 'paused' || body.status === 'completed') {
      auctionService.unregisterCampaign(campaignId);
    }

    res.status(200).json({ success: true, data: campaign });
  }

  async deleteCampaign(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const campaignId = req.params['id'];

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found', statusCode: 404 } }); return; }
    if (campaign.advertiserId !== userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not your campaign', statusCode: 403 } }); return; }
    if (campaign.status === 'active') { res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE', message: 'Pause or complete campaign before deleting', statusCode: 400 } }); return; }

    this.campaigns.delete(campaignId);
    auctionService.unregisterCampaign(campaignId);
    res.status(200).json({ success: true, data: { deleted: true } });
  }

  async createABTest(req: Request, res: Response): Promise<void> {
    const campaignId = req.params['id'];
    const body = req.body as { name: string; variants: { name: string; creativeId: string; weight: number }[] };

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found', statusCode: 404 } }); return; }

    const abTest: ABTest = {
      id: `ab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      campaignId,
      name: body.name,
      variants: body.variants.map(v => ({
        id: `var_${Math.random().toString(36).substring(2, 8)}`,
        ...v,
        metrics: { impressions: 0, clicks: 0, ctr: 0, conversions: 0, conversionRate: 0, spend: 0, cpm: 0, cpc: 0, cpa: 0, roas: 0, reach: 0, frequency: 0 },
      })),
      status: 'running',
      confidence: 0,
      startedAt: new Date().toISOString(),
    };

    this.abTests.set(abTest.id, abTest);
    campaign.abTests.push(abTest);

    res.status(201).json({ success: true, data: abTest });
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const campaigns = Array.from(this.campaigns.values()).filter(c => c.advertiserId === userId);

    const totalSpend = campaigns.reduce((sum, c) => sum + c.budget.spent, 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.metrics.impressions, 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + c.metrics.clicks, 0);

    res.status(200).json({
      success: true,
      data: {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalImpressions,
        totalClicks,
        overallCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        recentCampaigns: campaigns.slice(0, 5),
      },
    });
  }
}

export const campaignsController = new CampaignsController();
export default CampaignsController;
