// ============================================================================
// QuantSync - Webhooks Controller
// ============================================================================

import { webhookService } from '../services/webhook-service';

interface Request { params: Record<string, string>; query: Record<string, string>; body: any; user?: { id: string }; app?: { id: string; name: string } }
interface Response { status: (code: number) => Response; json: (data: any) => void }

export const webhooksController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const appId = req.app?.id || req.user?.id || 'default_app';
      const webhooks = await webhookService.getWebhooks(appId);
      res.status(200).json({ webhooks });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async register(req: Request, res: Response): Promise<void> {
    try {
      const appId = req.app?.id || req.user?.id || 'default_app';
      const appName = req.app?.name || 'Default App';
      const { url, events } = req.body;
      if (!url || !events) { res.status(400).json({ error: 'URL and events are required' }); return; }
      const webhook = await webhookService.registerWebhook(appId, appName, { url, events });
      res.status(201).json(webhook);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const appId = req.app?.id || req.user?.id || 'default_app';
      const webhook = await webhookService.updateWebhook(req.params.id, appId, req.body);
      res.status(200).json(webhook);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const appId = req.app?.id || req.user?.id || 'default_app';
      await webhookService.deleteWebhook(req.params.id, appId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit || '50');
      const status = req.query.status;
      const deliveries = await webhookService.getDeliveries(req.params.id, { limit, status });
      res.status(200).json({ deliveries });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async retryDelivery(req: Request, res: Response): Promise<void> {
    try {
      const appId = req.app?.id || req.user?.id || 'default_app';
      await webhookService.retryDelivery(req.params.deliveryId, appId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async rotateSecret(req: Request, res: Response): Promise<void> {
    try {
      const appId = req.app?.id || req.user?.id || 'default_app';
      const result = await webhookService.rotateSecret(req.params.id, appId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getRateLimit(req: Request, res: Response): Promise<void> {
    try {
      const appId = req.app?.id || req.user?.id || 'default_app';
      const status = await webhookService.getRateLimitStatus(appId);
      res.status(200).json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
