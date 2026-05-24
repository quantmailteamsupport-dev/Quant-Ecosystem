// ============================================================================
// QuantMail API - Email Controller
// Business logic for email endpoints
// ============================================================================

import type { Request, Response } from '../middleware';
import { EmailService } from '../services/email-service';
import type { ComposeEmailRequest, SearchEmailRequest, EmailCategory } from '../../src/types';

export class EmailController {
  private emailService: EmailService;

  constructor(emailService: EmailService) {
    this.emailService = emailService;
  }

  async listEmails(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const options = {
      label: req.query['label'] as string,
      category: req.query['category'] as EmailCategory | undefined,
      isRead: req.query['is_read'] !== undefined ? req.query['is_read'] === 'true' : undefined,
      isStarred: req.query['is_starred'] !== undefined ? req.query['is_starred'] === 'true' : undefined,
      isArchived: req.query['is_archived'] !== undefined ? req.query['is_archived'] === 'true' : undefined,
      page: Number(req.query['page']) || 1,
      pageSize: Math.min(Number(req.query['page_size']) || 50, 100),
    };

    const result = await this.emailService.listEmails(userId, options);
    res.status(200).json({
      success: true,
      data: result.emails,
      metadata: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: Math.ceil(result.total / result.pageSize) },
    });
  }

  async getEmail(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const email = await this.emailService.getEmail(emailId, userId);
    if (!email) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    // Mark as read on open
    await this.emailService.markAsRead(emailId, userId);
    res.status(200).json({ success: true, data: email });
  }

  async getThread(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const threadId = req.params['threadId'];
    const thread = await this.emailService.getThread(threadId, userId);
    if (!thread) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Thread not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: thread });
  }

  async compose(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const body = req.body as ComposeEmailRequest;

    // Validation
    if (!body.to || body.to.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one recipient is required', statusCode: 400 } });
      return;
    }
    if (!body.subject && !body.isDraft) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Subject is required', statusCode: 400 } });
      return;
    }

    const email = await this.emailService.composeEmail(userId, body);
    res.status(201).json({ success: true, data: email });
  }

  async send(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const email = await this.emailService.getEmail(emailId, userId);
    if (!email) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    const result = await this.emailService.sendEmail(emailId);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'SEND_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Email sent successfully', emailId } });
  }

  async reply(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const { body, replyAll } = req.body as { body: string; replyAll?: boolean };

    if (!body) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Reply body is required', statusCode: 400 } });
      return;
    }

    const reply = await this.emailService.replyToEmail(userId, emailId, body, replyAll);
    if (!reply) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Original email not found', statusCode: 404 } });
      return;
    }

    res.status(201).json({ success: true, data: reply });
  }

  async forward(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const { to, message } = req.body as { to: Array<{ email: string; name?: string }>; message?: string };

    if (!to || to.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one recipient is required', statusCode: 400 } });
      return;
    }

    const forwarded = await this.emailService.forwardEmail(userId, emailId, to, message);
    if (!forwarded) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Original email not found', statusCode: 404 } });
      return;
    }

    res.status(201).json({ success: true, data: forwarded });
  }

  async archive(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const success = await this.emailService.archiveEmail(emailId, userId);
    if (!success) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Email archived' } });
  }

  async deleteEmail(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const success = await this.emailService.deleteEmail(emailId, userId);
    if (!success) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Email deleted' } });
  }

  async search(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const searchParams: SearchEmailRequest = {
      query: req.query['q'] as string || '',
      from: req.query['from'] as string,
      to: req.query['to'] as string,
      subject: req.query['subject'] as string,
      hasAttachment: req.query['has_attachment'] !== undefined ? req.query['has_attachment'] === 'true' : undefined,
      label: req.query['label'] as string,
      category: req.query['category'] as EmailCategory,
      dateFrom: req.query['date_from'] as string,
      dateTo: req.query['date_to'] as string,
      isRead: req.query['is_read'] !== undefined ? req.query['is_read'] === 'true' : undefined,
      isStarred: req.query['is_starred'] !== undefined ? req.query['is_starred'] === 'true' : undefined,
      page: Number(req.query['page']) || 1,
      pageSize: Math.min(Number(req.query['page_size']) || 20, 100),
    };

    const result = await this.emailService.searchEmails(userId, searchParams);
    res.status(200).json({
      success: true,
      data: result.emails,
      metadata: { total: result.total, query: searchParams.query },
    });
  }

  async toggleStar(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const success = await this.emailService.toggleStar(emailId, userId);
    if (!success) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Star toggled' } });
  }

  async addLabel(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const { label } = req.body as { label: string };
    if (!label) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Label name is required', statusCode: 400 } });
      return;
    }

    const success = await this.emailService.addLabel(emailId, userId, label);
    if (!success) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: `Label "${label}" added` } });
  }

  async removeLabel(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const label = req.params['label'];
    const success = await this.emailService.removeLabel(emailId, userId, label);
    if (!success) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: `Label "${label}" removed` } });
  }

  async getLabels(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const labels = await this.emailService.getLabels(userId);
    res.status(200).json({ success: true, data: labels });
  }

  async createLabel(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { name, color } = req.body as { name: string; color: string };
    if (!name) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Label name is required', statusCode: 400 } });
      return;
    }

    const label = await this.emailService.createLabel(userId, name, color || '#808080');
    res.status(201).json({ success: true, data: label });
  }

  async getFilters(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const filters = await this.emailService.getFilters(userId);
    res.status(200).json({ success: true, data: filters });
  }

  async createFilter(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { name, conditions, actions } = req.body as { name: string; conditions: unknown[]; actions: unknown[] };
    if (!name || !conditions || !actions) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name, conditions, and actions are required', statusCode: 400 } });
      return;
    }

    const filter = await this.emailService.createFilter(userId, name, conditions as any, actions as any);
    res.status(201).json({ success: true, data: filter });
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const stats = await this.emailService.getStats(userId);
    res.status(200).json({ success: true, data: stats });
  }

  async addAttachment(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['id'];
    const email = await this.emailService.getEmail(emailId, userId);
    if (!email) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    const { filename, mimeType, size, data } = req.body as { filename: string; mimeType: string; size: number; data: string };
    if (!filename || !mimeType || !size) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Filename, mimeType, and size are required', statusCode: 400 } });
      return;
    }

    // Check attachment size limit (25MB)
    if (size > 25 * 1024 * 1024) {
      res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Attachment exceeds 25MB limit', statusCode: 400 } });
      return;
    }

    const attachment = await this.emailService.addAttachment(emailId, { filename, mimeType, size, data: data || '' });
    res.status(201).json({ success: true, data: attachment });
  }
}
