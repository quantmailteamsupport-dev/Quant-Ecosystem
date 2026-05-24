// ============================================================================
// QuantSync - Direct Messages Service
// Conversations CRUD, send with encryption, requests, read receipts, groups
// ============================================================================

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  encryptedContent?: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'system';
  mediaUrl?: string;
  replyToId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  name?: string;
  avatarUrl?: string;
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  encryptionKey?: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

interface ConversationStore {
  conversations: Map<string, Conversation>;
  messages: Map<string, Message[]>;
  requests: Map<string, MessageRequest[]>;
}

const store: ConversationStore = {
  conversations: new Map(),
  messages: new Map(),
  requests: new Map(),
};

function generateId(): string {
  return `dm_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function encryptMessage(content: string, key: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const keyBytes = encoder.encode(key);
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return Buffer.from(encrypted).toString('base64');
}

function decryptMessage(encrypted: string, key: string): string {
  const data = Buffer.from(encrypted, 'base64');
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key);
  const decrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    decrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(decrypted);
}

function generateEncryptionKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export class DMsService {
  async getConversations(userId: string, options: { limit?: number; offset?: number } = {}): Promise<{ conversations: Conversation[]; total: number }> {
    const { limit = 20, offset = 0 } = options;
    const userConversations = Array.from(store.conversations.values())
      .filter(c => c.participants.includes(userId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return {
      conversations: userConversations.slice(offset, offset + limit),
      total: userConversations.length,
    };
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    const conv = store.conversations.get(conversationId);
    if (!conv || !conv.participants.includes(userId)) return null;
    return conv;
  }

  async createConversation(creatorId: string, participantIds: string[], options: { name?: string; type?: 'direct' | 'group' } = {}): Promise<Conversation> {
    const { name, type = participantIds.length > 1 ? 'group' : 'direct' } = options;
    const allParticipants = [creatorId, ...participantIds.filter(id => id !== creatorId)];

    if (type === 'direct' && allParticipants.length === 2) {
      const existing = Array.from(store.conversations.values()).find(c =>
        c.type === 'direct' && c.participants.length === 2 &&
        c.participants.includes(allParticipants[0]) && c.participants.includes(allParticipants[1])
      );
      if (existing) return existing;
    }

    const conversation: Conversation = {
      id: generateId(),
      type,
      participants: allParticipants,
      name,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      encryptionKey: generateEncryptionKey(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.conversations.set(conversation.id, conversation);
    store.messages.set(conversation.id, []);
    return conversation;
  }

  async sendMessage(conversationId: string, senderId: string, content: string, options: { type?: Message['type']; mediaUrl?: string; replyToId?: string } = {}): Promise<Message> {
    const conversation = store.conversations.get(conversationId);
    if (!conversation) throw new Error('Conversation not found');
    if (!conversation.participants.includes(senderId)) throw new Error('Not a participant');

    const encryptedContent = conversation.encryptionKey ? encryptMessage(content, conversation.encryptionKey) : undefined;

    const message: Message = {
      id: generateId(),
      conversationId,
      senderId,
      content,
      encryptedContent,
      type: options.type || 'text',
      mediaUrl: options.mediaUrl,
      replyToId: options.replyToId,
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const messages = store.messages.get(conversationId) || [];
    messages.push(message);
    store.messages.set(conversationId, messages);

    conversation.lastMessage = message;
    conversation.updatedAt = new Date().toISOString();
    conversation.unreadCount++;

    return message;
  }

  async getMessages(conversationId: string, userId: string, options: { limit?: number; before?: string } = {}): Promise<{ messages: Message[]; hasMore: boolean }> {
    const { limit = 50, before } = options;
    const conversation = store.conversations.get(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) throw new Error('Access denied');

    let messages = store.messages.get(conversationId) || [];
    if (before) {
      const idx = messages.findIndex(m => m.id === before);
      if (idx > 0) messages = messages.slice(0, idx);
    }

    const result = messages.slice(-limit);
    return { messages: result, hasMore: messages.length > limit };
  }

  async markAsRead(conversationId: string, userId: string, messageIds: string[]): Promise<void> {
    const messages = store.messages.get(conversationId) || [];
    const now = new Date().toISOString();
    for (const msg of messages) {
      if (messageIds.includes(msg.id) && msg.senderId !== userId) {
        msg.isRead = true;
        msg.readAt = now;
      }
    }
    const conversation = store.conversations.get(conversationId);
    if (conversation) conversation.unreadCount = 0;
  }

  async sendMessageRequest(fromUserId: string, toUserId: string, message: string): Promise<MessageRequest> {
    const request: MessageRequest = {
      id: generateId(),
      fromUserId,
      toUserId,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const userRequests = store.requests.get(toUserId) || [];
    userRequests.push(request);
    store.requests.set(toUserId, userRequests);
    return request;
  }

  async getMessageRequests(userId: string): Promise<MessageRequest[]> {
    return (store.requests.get(userId) || []).filter(r => r.status === 'pending');
  }

  async acceptRequest(requestId: string, userId: string): Promise<Conversation> {
    const requests = store.requests.get(userId) || [];
    const request = requests.find(r => r.id === requestId);
    if (!request) throw new Error('Request not found');
    request.status = 'accepted';
    return this.createConversation(request.fromUserId, [userId]);
  }

  async declineRequest(requestId: string, userId: string): Promise<void> {
    const requests = store.requests.get(userId) || [];
    const request = requests.find(r => r.id === requestId);
    if (request) request.status = 'declined';
  }

  async createGroupConversation(creatorId: string, memberIds: string[], name: string): Promise<Conversation> {
    return this.createConversation(creatorId, memberIds, { name, type: 'group' });
  }

  async pinConversation(conversationId: string, userId: string): Promise<void> {
    const conv = store.conversations.get(conversationId);
    if (conv && conv.participants.includes(userId)) {
      conv.isPinned = !conv.isPinned;
    }
  }

  async muteConversation(conversationId: string, userId: string): Promise<void> {
    const conv = store.conversations.get(conversationId);
    if (conv && conv.participants.includes(userId)) {
      conv.isMuted = !conv.isMuted;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    for (const [convId, messages] of store.messages) {
      const idx = messages.findIndex(m => m.id === messageId && m.senderId === userId);
      if (idx >= 0) {
        messages.splice(idx, 1);
        break;
      }
    }
  }
}

export const dmsService = new DMsService();
