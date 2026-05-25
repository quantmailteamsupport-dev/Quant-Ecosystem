// ============================================================================
// QuantEdits - Plugins Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { pluginSystemService } from '../services/plugin-system-service';

class PluginsController {
  async getMarketplace(req: Request, res: Response): Promise<void> {
    try {
      const { category, sort, limit } = req.query as any;
      const listings = await pluginSystemService.getMarketplace({ category, sort, limit: Number(limit) });
      res.status(200).json({ success: true, data: listings });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async searchPlugins(req: Request, res: Response): Promise<void> {
    try {
      const { query, category } = req.query as { query?: string; category?: any };
      const results = await pluginSystemService.search(query || '', category);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async installPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { listingId, userId } = req.body as { listingId: string; userId: string };
      if (!listingId || !userId) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'listingId and userId required' } }); return; }
      const plugin = await pluginSystemService.installPlugin(listingId, userId);
      res.status(201).json({ success: true, data: plugin });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'INSTALL_ERROR', message: error.message } }); }
  }

  async uninstallPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params as { pluginId: string };
      const { userId } = req.body as { userId: string };
      await pluginSystemService.uninstallPlugin(pluginId, userId);
      res.status(200).json({ success: true, data: { uninstalled: true } });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'UNINSTALL_ERROR', message: error.message } }); }
  }

  async loadPlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params as { pluginId: string };
      const { userId } = req.body as { userId: string };
      const plugin = await pluginSystemService.loadPlugin(pluginId, userId);
      res.status(200).json({ success: true, data: plugin });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'LOAD_ERROR', message: error.message } }); }
  }

  async executePlugin(req: Request, res: Response): Promise<void> {
    try {
      const { pluginId } = req.params as { pluginId: string };
      const { input } = req.body as { input: Record<string, any> };
      const result = await pluginSystemService.sandboxExec(pluginId, input || {});
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'EXEC_ERROR', message: error.message } }); }
  }

  async validatePlugin(req: Request, res: Response): Promise<void> {
    try {
      const pluginData = req.body as { name: string; code: string; permissions: any[] };
      const validation = await pluginSystemService.validatePlugin(pluginData);
      res.status(200).json({ success: true, data: validation });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } }); }
  }
}

export const pluginsController = new PluginsController();
export { PluginsController };
