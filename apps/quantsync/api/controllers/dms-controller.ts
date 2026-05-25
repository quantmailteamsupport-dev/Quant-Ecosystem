// ============================================================================
// QuantSync - DMs Controller
// ============================================================================

import { dmsService } from '../services/dms-service';

interface Request { params: Record<string, string>; query: Record<string, string>; body: any; user?: { id: string } }
interface Response { status: (code: number) => Response; json: (data: any) => void }

export const dmsController = {
  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const limit = parseInt(req.query.limit || '20');
      const offset = parseInt(req.query.offset || '0');
      const result = await dmsService.getConversations(userId, { limit, offset });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const conversation = await dmsService.getConversation(req.params.id, userId);
      if (!conversation) { res.status(404).json({ error: 'Not found' }); return; }
      res.status(200).json(conversation);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { participantIds, name } = req.body;
      const conversation = await dmsService.createConversation(userId, participantIds, { name });
      res.status(201).json(conversation);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { conversationId, to, content, type, mediaUrl, replyToId } = req.body;
      let convId = conversationId;
      if (!convId && to) {
        const conv = await dmsService.createConversation(userId, [to]);
        convId = conv.id;
      }
      const message = await dmsService.sendMessage(convId, userId, content, { type, mediaUrl, replyToId });
      res.status(201).json(message);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { limit, before } = req.query;
      const result = await dmsService.getMessages(req.params.id, userId, { limit: parseInt(limit || '50'), before });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { messageIds } = req.body;
      await dmsService.markAsRead(req.params.id, userId, messageIds || []);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const requests = await dmsService.getMessageRequests(userId);
      res.status(200).json({ requests });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const conversation = await dmsService.acceptRequest(req.params.id, userId);
      res.status(200).json(conversation);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async declineRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      await dmsService.declineRequest(req.params.id, userId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { name, members } = req.body;
      const conversation = await dmsService.createGroupConversation(userId, members, name);
      res.status(201).json(conversation);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async pinConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      await dmsService.pinConversation(req.params.id, userId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async muteConversation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      await dmsService.muteConversation(req.params.id, userId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      await dmsService.deleteMessage(req.params.id, userId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
