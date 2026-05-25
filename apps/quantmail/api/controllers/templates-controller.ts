// ============================================================================
// QuantMail API - Templates Controller
// Template CRUD, rendering, mail merge, preview operations
// ============================================================================

import type { Request, Response } from '../middleware';
import { templateService } from '../services/template-service';

export class TemplatesController {
  async createTemplate(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { name: string; subject: string; bodyHtml: string; bodyText?: string; category?: string; tags?: string[] };

    if (!body.name || !body.subject || !body.bodyHtml) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Name, subject, and body HTML are required', statusCode: 400 } });
      return;
    }

    try {
      const template = await templateService.create(userId, body);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create template';
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async listTemplates(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const category = req.query['category'] as string | undefined;
    const tag = req.query['tag'] as string | undefined;
    const search = req.query['search'] as string | undefined;

    const templates = await templateService.list(userId, { category, tag, search });
    res.status(200).json({ success: true, data: templates, metadata: { count: templates.length } });
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const templateId = req.params['templateId'];
    const templates = await templateService.list(userId);
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: template });
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const templateId = req.params['templateId'];
    const body = req.body;

    try {
      const template = await templateService.update(templateId, userId, body);
      res.status(200).json({ success: true, data: template });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update template';
      const statusCode = msg.includes('not found') ? 404 : 400;
      res.status(statusCode).json({ success: false, error: { code: 'UPDATE_FAILED', message: msg, statusCode } });
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const templateId = req.params['templateId'];

    try {
      await templateService.delete(templateId, userId);
      res.status(200).json({ success: true, data: { message: 'Template deleted' } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete template';
      res.status(404).json({ success: false, error: { code: 'DELETE_FAILED', message: msg, statusCode: 404 } });
    }
  }

  async renderTemplate(req: Request, res: Response): Promise<void> {
    const templateId = req.params['templateId'];
    const body = req.body as { variables: Record<string, string> };

    if (!body.variables) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Variables object is required', statusCode: 400 } });
      return;
    }

    try {
      const result = await templateService.render(templateId, body.variables);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to render template';
      res.status(400).json({ success: false, error: { code: 'RENDER_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async previewTemplate(req: Request, res: Response): Promise<void> {
    const templateId = req.params['templateId'];
    const body = req.body as { sampleData?: Record<string, string> };

    try {
      const result = await templateService.preview(templateId, body.sampleData);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to preview template';
      res.status(400).json({ success: false, error: { code: 'PREVIEW_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async mailMerge(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const templateId = req.params['templateId'];
    const body = req.body as { recipients: Array<{ email: string; name: string; variables: Record<string, string> }> };

    if (!body.recipients || body.recipients.length === 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Recipients list is required', statusCode: 400 } });
      return;
    }

    try {
      const result = await templateService.mailMerge(templateId, userId, body.recipients);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to execute mail merge';
      res.status(400).json({ success: false, error: { code: 'MERGE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async duplicateTemplate(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const templateId = req.params['templateId'];
    const body = req.body as { name?: string };

    try {
      const template = await templateService.duplicate(templateId, userId, body.name);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to duplicate template';
      res.status(400).json({ success: false, error: { code: 'DUPLICATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getUsageStats(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const stats = await templateService.getUsageStats(userId);
    res.status(200).json({ success: true, data: stats });
  }
}

export const templatesController = new TemplatesController();
