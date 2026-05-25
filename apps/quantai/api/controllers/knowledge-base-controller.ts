// ============================================================================
// QuantAI - Knowledge Base Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { knowledgeBaseService } from '../services/knowledge-base-service';

class KnowledgeBaseController {
  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { userId, filename, content, metadata } = req.body as any;
      if (!userId || !filename || !content) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId, filename, and content required' } }); return; }
      const doc = await knowledgeBaseService.uploadDocument(userId, filename, content, metadata || {});
      res.status(201).json({ success: true, data: doc });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message: error.message } }); }
  }

  async index(req: Request, res: Response): Promise<void> {
    try {
      const { docId } = req.params as { docId: string };
      const doc = await knowledgeBaseService.index(docId);
      res.status(200).json({ success: true, data: { id: doc.id, status: doc.status, chunks: doc.chunks.length } });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'INDEX_ERROR', message: error.message } }); }
  }

  async query(req: Request, res: Response): Promise<void> {
    try {
      const { userId, question, limit, threshold } = req.body as any;
      if (!userId || !question) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId and question required' } }); return; }
      const results = await knowledgeBaseService.query(userId, question, { limit, threshold });
      res.status(200).json({ success: true, data: results });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'QUERY_ERROR', message: error.message } }); }
  }

  async getContext(req: Request, res: Response): Promise<void> {
    try {
      const { userId, question, maxTokens } = req.body as any;
      if (!userId || !question) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId and question required' } }); return; }
      const context = await knowledgeBaseService.getRelevantContext(userId, question, maxTokens);
      res.status(200).json({ success: true, data: context });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'CONTEXT_ERROR', message: error.message } }); }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params as { userId: string };
      const stats = await knowledgeBaseService.getStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }

  async listDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params as { userId: string };
      const { status, tag, limit } = req.query as any;
      const docs = await knowledgeBaseService.listDocuments(userId, { status, tag, limit: Number(limit) });
      res.status(200).json({ success: true, data: docs });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }
}

export const knowledgeBaseController = new KnowledgeBaseController();
export { KnowledgeBaseController };
