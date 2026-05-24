// ============================================================================
// QuantAds - Creatives Controller
// Ad creatives management (image, video, carousel, interactive)
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Creative, CreativeFormat, CreativeAsset } from '../../src/types';

class CreativesController {
  private creatives: Map<string, Creative> = new Map();

  async createCreative(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      campaignId: string;
      name: string;
      format: CreativeFormat;
      headline: string;
      description: string;
      callToAction: string;
      destinationUrl: string;
      assets: CreativeAsset[];
    };

    if (!body.campaignId || !body.name || !body.format || !body.headline) {
      res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'campaignId, name, format, and headline are required', statusCode: 400 } });
      return;
    }

    const creative: Creative = {
      id: `creative_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      campaignId: body.campaignId,
      name: body.name,
      format: body.format,
      headline: body.headline,
      description: body.description || '',
      callToAction: body.callToAction || 'Learn More',
      destinationUrl: body.destinationUrl || '',
      assets: body.assets || [],
      status: 'pending_review',
      performance: { impressions: 0, clicks: 0, ctr: 0, conversions: 0, spend: 0, qualityScore: 0.5 },
      createdAt: new Date().toISOString(),
    };

    this.creatives.set(creative.id, creative);
    res.status(201).json({ success: true, data: creative });
  }

  async getCreative(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const creative = this.creatives.get(id);
    if (!creative) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Creative not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: creative });
  }

  async listCreatives(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const campaignId = query['campaignId'];
    const format = query['format'] as CreativeFormat | undefined;

    let creatives = Array.from(this.creatives.values());
    if (campaignId) creatives = creatives.filter(c => c.campaignId === campaignId);
    if (format) creatives = creatives.filter(c => c.format === format);

    res.status(200).json({ success: true, data: creatives, meta: { total: creatives.length } });
  }

  async updateCreative(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const body = req.body as Partial<Creative>;

    const creative = this.creatives.get(id);
    if (!creative) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Creative not found', statusCode: 404 } }); return; }

    if (body.headline) creative.headline = body.headline;
    if (body.description) creative.description = body.description;
    if (body.callToAction) creative.callToAction = body.callToAction;
    if (body.destinationUrl) creative.destinationUrl = body.destinationUrl;
    if (body.assets) creative.assets = body.assets;

    // Reset review status when edited
    creative.status = 'pending_review';

    res.status(200).json({ success: true, data: creative });
  }

  async deleteCreative(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    if (!this.creatives.has(id)) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Creative not found', statusCode: 404 } }); return; }
    this.creatives.delete(id);
    res.status(200).json({ success: true, data: { deleted: true } });
  }

  async duplicateCreative(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const creative = this.creatives.get(id);
    if (!creative) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Creative not found', statusCode: 404 } }); return; }

    const duplicate: Creative = {
      ...creative,
      id: `creative_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: `${creative.name} (Copy)`,
      status: 'draft',
      performance: { impressions: 0, clicks: 0, ctr: 0, conversions: 0, spend: 0, qualityScore: 0.5 },
      createdAt: new Date().toISOString(),
    };

    this.creatives.set(duplicate.id, duplicate);
    res.status(201).json({ success: true, data: duplicate });
  }

  async getCreativePreview(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const query = req.query as Record<string, string>;
    const placement = query['placement'] || 'feed';

    const creative = this.creatives.get(id);
    if (!creative) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Creative not found', statusCode: 404 } }); return; }

    res.status(200).json({
      success: true,
      data: {
        creative,
        preview: {
          placement,
          renderHtml: this.generatePreviewHtml(creative, placement),
          dimensions: this.getDimensionsForPlacement(placement),
        },
      },
    });
  }

  private generatePreviewHtml(creative: Creative, placement: string): string {
    return `<div class="ad-${placement}"><h3>${creative.headline}</h3><p>${creative.description}</p><a>${creative.callToAction}</a></div>`;
  }

  private getDimensionsForPlacement(placement: string): { width: number; height: number } {
    const sizes: Record<string, { width: number; height: number }> = {
      feed: { width: 600, height: 400 },
      sidebar: { width: 300, height: 250 },
      banner: { width: 728, height: 90 },
      stories: { width: 1080, height: 1920 },
      'pre-roll': { width: 1920, height: 1080 },
    };
    return sizes[placement] || { width: 600, height: 400 };
  }
}

export const creativesController = new CreativesController();
export default CreativesController;
