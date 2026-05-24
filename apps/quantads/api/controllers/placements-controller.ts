// ============================================================================
// QuantAds - Placements Controller
// Ad placement configuration across all 9 ecosystem apps
// ============================================================================

import type { Request, Response } from '../middleware';
import { deliveryService } from '../services/delivery-service';

class PlacementsController {
  async listPlacements(req: Request, res: Response): Promise<void> {
    const placements = deliveryService.getAvailablePlacements();
    res.status(200).json({ success: true, data: placements });
  }

  async getPlacementsByApp(req: Request, res: Response): Promise<void> {
    const app = req.params['app'];
    const allPlacements = deliveryService.getAvailablePlacements();
    const appPlacements = allPlacements.find(p => p.app === app);

    if (!appPlacements) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'App not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: appPlacements });
  }

  async getPlacementSpecs(req: Request, res: Response): Promise<void> {
    const specs = {
      formats: [
        { id: 'image', name: 'Static Image', sizes: ['300x250', '728x90', '600x400', '1080x1920'], maxSize: '5MB' },
        { id: 'video', name: 'Video', sizes: ['1920x1080', '1080x1920', '720x720'], maxDuration: '60s', maxSize: '100MB' },
        { id: 'carousel', name: 'Carousel', minCards: 2, maxCards: 10, cardSize: '600x600' },
        { id: 'interactive', name: 'Interactive/HTML5', sizes: ['300x250', '600x400'], maxSize: '2MB' },
        { id: 'native', name: 'Native', description: 'Adapts to platform style', minAssets: ['image', 'headline', 'description'] },
      ],
      guidelines: {
        textOverlay: 'Maximum 20% of image area',
        aspectRatios: { feed: '4:3 or 1:1', stories: '9:16', banner: '8:1', video: '16:9' },
        characterLimits: { headline: 40, description: 125, callToAction: 15 },
      },
    };

    res.status(200).json({ success: true, data: specs });
  }

  async previewPlacement(req: Request, res: Response): Promise<void> {
    const body = req.body as { app: string; position: string; creativeId: string };

    res.status(200).json({
      success: true,
      data: {
        app: body.app,
        position: body.position,
        mockup: `https://ads.quant.app/preview/${body.app}/${body.position}/${body.creativeId}`,
        dimensions: this.getDimensions(body.position),
      },
    });
  }

  private getDimensions(position: string): { width: number; height: number } {
    const dims: Record<string, { width: number; height: number }> = {
      feed: { width: 600, height: 400 },
      sidebar: { width: 300, height: 250 },
      banner: { width: 728, height: 90 },
      stories: { width: 1080, height: 1920 },
      interstitial: { width: 1080, height: 1920 },
      'pre-roll': { width: 1920, height: 1080 },
      'mid-roll': { width: 1920, height: 1080 },
      native: { width: 600, height: 400 },
    };
    return dims[position] || { width: 600, height: 400 };
  }
}

export const placementsController = new PlacementsController();
export default PlacementsController;
