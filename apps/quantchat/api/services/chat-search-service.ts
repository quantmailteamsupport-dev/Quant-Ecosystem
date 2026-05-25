// ============================================================================
// QuantChat - Chat Search Service
// Full-text message search, media search, link search with filters
// ============================================================================

interface SearchResult {
  messageId: string;
  chatId: string;
  senderId: string;
  content: string;
  highlight: string;
  type: 'text' | 'media' | 'link' | 'document';
  timestamp: Date;
  relevanceScore: number;
}

interface SearchFilters {
  chatId?: string;
  senderId?: string;
  dateRange?: { start: Date; end: Date };
  messageType?: ('text' | 'image' | 'video' | 'audio' | 'document' | 'link')[];
  hasMedia?: boolean;
  minLength?: number;
  maxLength?: number;
}

interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters: SearchFilters;
  resultCount: number;
  searchedAt: Date;
}

interface IndexedMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  links: string[];
  mediaUrls: string[];
  timestamp: Date;
  tokens: string[];
}

export class ChatSearchService {
  private messageIndex: Map<string, IndexedMessage> = new Map();
  private chatMessageIndex: Map<string, string[]> = new Map();
  private searchHistories: Map<string, SearchHistory[]> = new Map();

  async indexMessage(message: { id: string; chatId: string; senderId: string; content: string; type: string; mediaUrl?: string; timestamp: Date }): Promise<void> {
    const links = this.extractLinks(message.content);
    const mediaUrls = message.mediaUrl ? [message.mediaUrl] : [];
    const tokens = this.tokenize(message.content);

    const indexed: IndexedMessage = {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content,
      type: message.type as IndexedMessage['type'],
      links,
      mediaUrls,
      timestamp: message.timestamp,
      tokens,
    };

    this.messageIndex.set(message.id, indexed);
    const chatMessages = this.chatMessageIndex.get(message.chatId) || [];
    chatMessages.push(message.id);
    this.chatMessageIndex.set(message.chatId, chatMessages);
  }

  async searchMessages(userId: string, query: string, filters?: SearchFilters): Promise<{ results: SearchResult[]; total: number; took: number }> {
    const startTime = Date.now();
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const queryTokens = this.tokenize(query.toLowerCase());
    const results: SearchResult[] = [];

    for (const msg of this.messageIndex.values()) {
      if (!this.matchesFilters(msg, filters)) continue;

      const score = this.calculateRelevance(queryTokens, msg);
      if (score > 0) {
        results.push({
          messageId: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          content: msg.content,
          highlight: this.generateHighlight(msg.content, query),
          type: msg.links.length > 0 ? 'link' : msg.mediaUrls.length > 0 ? 'media' : 'text',
          timestamp: msg.timestamp,
          relevanceScore: score,
        });
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const took = Date.now() - startTime;

    // Record search history
    this.addToHistory(userId, query, filters || {}, results.length);

    return { results: results.slice(0, 50), total: results.length, took };
  }

  async searchMedia(userId: string, chatId?: string, mediaType?: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const msg of this.messageIndex.values()) {
      if (chatId && msg.chatId !== chatId) continue;
      if (msg.mediaUrls.length === 0 && msg.type === 'text') continue;
      if (mediaType && msg.type !== mediaType) continue;

      results.push({
        messageId: msg.id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        content: msg.content,
        highlight: msg.mediaUrls[0] || msg.content.substring(0, 100),
        type: 'media',
        timestamp: msg.timestamp,
        relevanceScore: 1,
      });
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async searchLinks(userId: string, chatId?: string): Promise<Array<{ url: string; messageId: string; chatId: string; sentBy: string; sentAt: Date }>> {
    const links: Array<{ url: string; messageId: string; chatId: string; sentBy: string; sentAt: Date }> = [];

    for (const msg of this.messageIndex.values()) {
      if (chatId && msg.chatId !== chatId) continue;
      for (const url of msg.links) {
        links.push({
          url,
          messageId: msg.id,
          chatId: msg.chatId,
          sentBy: msg.senderId,
          sentAt: msg.timestamp,
        });
      }
    }

    return links.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  async searchDocuments(userId: string, chatId?: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const msg of this.messageIndex.values()) {
      if (chatId && msg.chatId !== chatId) continue;
      if (msg.type !== 'document') continue;

      results.push({
        messageId: msg.id,
        chatId: msg.chatId,
        senderId: msg.senderId,
        content: msg.content,
        highlight: msg.content.substring(0, 100),
        type: 'document',
        timestamp: msg.timestamp,
        relevanceScore: 1,
      });
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getSearchHistory(userId: string, limit: number = 20): Promise<SearchHistory[]> {
    const history = this.searchHistories.get(userId) || [];
    return history.slice(-limit).reverse();
  }

  async clearHistory(userId: string): Promise<void> {
    this.searchHistories.delete(userId);
  }

  async getSearchSuggestions(userId: string, partial: string): Promise<string[]> {
    if (!partial || partial.length < 2) return [];

    const history = this.searchHistories.get(userId) || [];
    const suggestions = new Set<string>();

    // From search history
    for (const h of history) {
      if (h.query.toLowerCase().startsWith(partial.toLowerCase())) {
        suggestions.add(h.query);
      }
    }

    // From indexed messages (popular terms)
    const partialLower = partial.toLowerCase();
    const termCounts = new Map<string, number>();

    for (const msg of this.messageIndex.values()) {
      for (const token of msg.tokens) {
        if (token.startsWith(partialLower) && token.length > partial.length) {
          termCounts.set(token, (termCounts.get(token) || 0) + 1);
        }
      }
    }

    const sorted = Array.from(termCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [term] of sorted) {
      suggestions.add(term);
    }

    return Array.from(suggestions).slice(0, 10);
  }

  private matchesFilters(msg: IndexedMessage, filters?: SearchFilters): boolean {
    if (!filters) return true;
    if (filters.chatId && msg.chatId !== filters.chatId) return false;
    if (filters.senderId && msg.senderId !== filters.senderId) return false;
    if (filters.dateRange) {
      if (msg.timestamp < filters.dateRange.start || msg.timestamp > filters.dateRange.end) return false;
    }
    if (filters.messageType && !filters.messageType.includes(msg.type as any)) return false;
    if (filters.hasMedia !== undefined) {
      const hasMedia = msg.mediaUrls.length > 0 || msg.type !== 'text';
      if (filters.hasMedia !== hasMedia) return false;
    }
    if (filters.minLength && msg.content.length < filters.minLength) return false;
    if (filters.maxLength && msg.content.length > filters.maxLength) return false;
    return true;
  }

  private calculateRelevance(queryTokens: string[], msg: IndexedMessage): number {
    let score = 0;
    const contentLower = msg.content.toLowerCase();

    for (const token of queryTokens) {
      if (contentLower.includes(token)) {
        score += 1;
        // Exact word match bonus
        if (msg.tokens.includes(token)) score += 0.5;
        // Title/start bonus
        if (contentLower.startsWith(token)) score += 0.3;
      }
    }

    // Recency bonus (messages within last week get a boost)
    const ageMs = Date.now() - msg.timestamp.getTime();
    if (ageMs < 7 * 86400000) score *= 1.2;

    return Math.round(score * 100) / 100;
  }

  private generateHighlight(content: string, query: string): string {
    const maxLength = 150;
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const idx = contentLower.indexOf(queryLower);

    if (idx === -1) return content.substring(0, maxLength);

    const start = Math.max(0, idx - 30);
    const end = Math.min(content.length, idx + query.length + 30);
    let highlight = content.substring(start, end);

    if (start > 0) highlight = '...' + highlight;
    if (end < content.length) highlight = highlight + '...';

    return highlight;
  }

  private extractLinks(text: string): string[] {
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    return text.match(urlPattern) || [];
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  private addToHistory(userId: string, query: string, filters: SearchFilters, resultCount: number): void {
    const history = this.searchHistories.get(userId) || [];
    history.push({
      id: `sh_${Date.now()}`,
      userId,
      query,
      filters,
      resultCount,
      searchedAt: new Date(),
    });
    // Keep last 100
    if (history.length > 100) history.splice(0, history.length - 100);
    this.searchHistories.set(userId, history);
  }
}

export const chatSearchService = new ChatSearchService();
