// ============================================================================
// QuantNeon API - Messages Controller
// DMs integrated with QuantChat (cross-app messaging)
// ============================================================================

import type { Request, Response } from '../middleware';

interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'video' | 'post_share' | 'reel_share' | 'story_reply';
  content: string;
  mediaUrl?: string;
  sharedContentId?: string;
  createdAt: string;
  read: boolean;
}

const conversations: Map<string, Conversation> = new Map();
const messages: Map<string, Message[]> = new Map();

class MessagesController {
  async getConversations(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userConvos = Array.from(conversations.values()).filter(c => c.participants.includes(userId)).sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt));
    res.status(200).json({ success: true, data: { conversations: userConvos } });
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const userId = req.userId || '';
    let convo = Array.from(conversations.values()).find(c => c.participants.includes(userId) && c.participants.includes(body.recipientId));
    if (!convo) { convo = { id: `conv_${Date.now().toString(36)}`, participants: [userId, body.recipientId], lastMessage: '', lastMessageAt: '', unreadCount: 0 }; conversations.set(convo.id, convo); }
    const msg: Message = { id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`, conversationId: convo.id, senderId: userId, type: body.type || 'text', content: body.content || '', mediaUrl: body.mediaUrl, sharedContentId: body.sharedContentId, createdAt: new Date().toISOString(), read: false };
    const convoMessages = messages.get(convo.id) || [];
    convoMessages.push(msg);
    messages.set(convo.id, convoMessages);
    convo.lastMessage = msg.content;
    convo.lastMessageAt = msg.createdAt;
    convo.unreadCount++;
    res.status(201).json({ success: true, data: { message: msg } });
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    const convoMessages = messages.get(req.params.conversationId) || [];
    res.status(200).json({ success: true, data: { messages: convoMessages.slice(-50) } });
  }

  async markRead(req: Request, res: Response): Promise<void> {
    const convo = conversations.get(req.params.conversationId);
    if (convo) convo.unreadCount = 0;
    res.status(200).json({ success: true, data: { read: true } });
  }

  async deleteMessage(req: Request, res: Response): Promise<void> {
    for (const [convoId, convoMessages] of messages) {
      const idx = convoMessages.findIndex(m => m.id === req.params.messageId && m.senderId === req.userId);
      if (idx > -1) { convoMessages.splice(idx, 1); res.status(200).json({ success: true, data: { deleted: true } }); return; }
    }
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found', statusCode: 404 } });
  }

  async sharePost(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(200).json({ success: true, data: { shared: true, postId: body.postId, recipientId: body.recipientId, type: 'post_share' } });
  }

  async shareReel(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(200).json({ success: true, data: { shared: true, reelId: body.reelId, recipientId: body.recipientId, type: 'reel_share' } });
  }
}

export const messagesController = new MessagesController();
