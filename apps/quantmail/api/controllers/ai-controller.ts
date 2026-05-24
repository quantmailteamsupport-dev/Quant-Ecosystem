// ============================================================================
// QuantMail API - AI Controller
// Business logic for AI feature endpoints
// ============================================================================

import type { Request, Response } from '../middleware';
import { AIService } from '../services/ai-service';
import { EmailService } from '../services/email-service';
import type { AIComposeRequest, Email } from '../../src/types';

export class AIController {
  private aiService: AIService;
  private emailService: EmailService;

  constructor(aiService: AIService, emailService: EmailService) {
    this.aiService = aiService;
    this.emailService = emailService;
  }

  async smartCompose(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const body = req.body as AIComposeRequest;
    if (!body.instructions) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Instructions are required', statusCode: 400 } });
      return;
    }

    const result = await this.aiService.smartCompose(userId, body);
    res.status(200).json({ success: true, data: result });
  }

  async autocomplete(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { text, subject, recipients } = req.body as { text: string; subject?: string; recipients?: string[] };
    if (!text) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Text is required', statusCode: 400 } });
      return;
    }

    const completions = await this.aiService.autocomplete(userId, text, { subject, recipients });
    res.status(200).json({ success: true, data: { completions } });
  }

  async summarizeEmail(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['emailId'];
    const email = await this.emailService.getEmail(emailId, userId);
    if (!email) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    const summary = await this.aiService.summarizeEmail(userId, email);
    res.status(200).json({ success: true, data: { emailId, summary } });
  }

  async summarizeThread(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const threadId = req.params['threadId'];
    const thread = await this.emailService.getThread(threadId, userId);
    if (!thread) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Thread not found', statusCode: 404 } });
      return;
    }

    const summary = await this.aiService.summarizeThread(userId, thread.messages);
    res.status(200).json({ success: true, data: { threadId, summary, messageCount: thread.messageCount } });
  }

  async categorizeEmails(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { emailIds } = req.body as { emailIds: string[] };
    if (!emailIds || emailIds.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'emailIds array is required', statusCode: 400 } });
      return;
    }

    // Fetch emails
    const emails: Email[] = [];
    for (const id of emailIds) {
      const email = await this.emailService.getEmail(id, userId);
      if (email) emails.push(email);
    }

    if (emails.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No valid emails found', statusCode: 404 } });
      return;
    }

    const categories = await this.aiService.categorizeEmails(userId, emails);
    const result = Array.from(categories.entries()).map(([emailId, category]) => ({ emailId, category }));

    res.status(200).json({ success: true, data: result });
  }

  async detectPriority(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { emailIds } = req.body as { emailIds: string[] };
    if (!emailIds || emailIds.length === 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'emailIds array is required', statusCode: 400 } });
      return;
    }

    const emails: Email[] = [];
    for (const id of emailIds) {
      const email = await this.emailService.getEmail(id, userId);
      if (email) emails.push(email);
    }

    const priorities = await this.aiService.detectPriority(userId, emails);
    const result = Array.from(priorities.entries()).map(([emailId, priority]) => ({ emailId, priority }));

    res.status(200).json({ success: true, data: result });
  }

  async extractMeetings(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['emailId'];
    const email = await this.emailService.getEmail(emailId, userId);
    if (!email) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    const meetings = await this.aiService.extractMeetings(userId, email);
    res.status(200).json({ success: true, data: { emailId, meetings } });
  }

  async suggestReplies(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const emailId = req.params['emailId'];
    const email = await this.emailService.getEmail(emailId, userId);
    if (!email) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found', statusCode: 404 } });
      return;
    }

    const suggestions = await this.aiService.generateReplySuggestions(userId, email);
    res.status(200).json({ success: true, data: { emailId, suggestions } });
  }
}
