// ============================================================================
// QuantMail API - Email Service
// SMTP/IMAP handling, email rendering, threading
// ============================================================================

import type {
  Email,
  EmailThread,
  EmailLabel,
  EmailFilter,
  EmailAttachment,
  EmailAddress,
  EmailPriority,
  EmailCategory,
  EmailStatus,
  ComposeEmailRequest,
  SearchEmailRequest,
  FilterCondition,
  FilterAction,
} from '../../src/types';

// ----------------------------------------------------------------------------
// Email Service
// ----------------------------------------------------------------------------

export class EmailService {
  private emails: Map<string, Email> = new Map();
  private threads: Map<string, EmailThread> = new Map();
  private labels: Map<string, EmailLabel> = new Map();
  private filters: Map<string, EmailFilter> = new Map();
  private attachments: Map<string, EmailAttachment> = new Map();

  constructor() {
    this.initializeSystemLabels();
  }

  // --------------------------------------------------------------------------
  // Email CRUD Operations
  // --------------------------------------------------------------------------

  async composeEmail(userId: string, request: ComposeEmailRequest): Promise<Email> {
    const emailId = this.generateId('email');
    const threadId = request.inReplyTo
      ? this.findThreadForEmail(request.inReplyTo) || this.generateId('thread')
      : this.generateId('thread');

    const email: Email = {
      id: emailId,
      threadId,
      userId,
      from: { email: `${userId}@quantmail.app`, name: 'User' },
      to: request.to,
      cc: request.cc || [],
      bcc: request.bcc || [],
      subject: request.subject,
      bodyText: request.bodyText,
      bodyHtml: request.bodyHtml || this.textToHtml(request.bodyText),
      snippet: request.bodyText.substring(0, 200),
      priority: request.priority || 'normal',
      category: 'primary',
      status: request.isDraft ? 'draft' : 'sending',
      isRead: true,
      isStarred: false,
      isArchived: false,
      isDraft: request.isDraft || false,
      labels: request.isDraft ? ['draft'] : ['sent'],
      attachments: [],
      inReplyTo: request.inReplyTo,
      references: request.inReplyTo ? [request.inReplyTo] : [],
      headers: {
        'Message-ID': `<${emailId}@quantmail.app>`,
        'Date': new Date().toUTCString(),
        'MIME-Version': '1.0',
        'Content-Type': 'multipart/alternative; boundary="boundary-' + emailId + '"',
      },
      receivedAt: new Date(),
      scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.emails.set(emailId, email);
    this.updateThread(threadId, email);

    return email;
  }

  async sendEmail(emailId: string): Promise<{ success: boolean; error?: string }> {
    const email = this.emails.get(emailId);
    if (!email) return { success: false, error: 'Email not found' };

    if (email.to.length === 0) {
      return { success: false, error: 'At least one recipient is required' };
    }

    // Validate all recipient addresses
    for (const recipient of [...email.to, ...email.cc, ...email.bcc]) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
        return { success: false, error: `Invalid recipient address: ${recipient.email}` };
      }
    }

    email.status = 'sent';
    email.isDraft = false;
    email.labels = email.labels.filter((l) => l !== 'draft');
    if (!email.labels.includes('sent')) {
      email.labels.push('sent');
    }
    email.updatedAt = new Date();

    // Simulate delivery for internal recipients
    for (const recipient of email.to) {
      if (recipient.email.endsWith('@quantmail.app')) {
        await this.deliverToInbox(email, recipient);
      }
    }

    return { success: true };
  }

  async getEmail(emailId: string, userId: string): Promise<Email | null> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return null;
    return email;
  }

  async getThread(threadId: string, userId: string): Promise<EmailThread | null> {
    const thread = this.threads.get(threadId);
    if (!thread || thread.userId !== userId) return null;

    // Populate messages
    const messages: Email[] = [];
    for (const email of this.emails.values()) {
      if (email.threadId === threadId && email.userId === userId) {
        messages.push(email);
      }
    }
    messages.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
    thread.messages = messages;

    return thread;
  }

  async listEmails(userId: string, options: {
    label?: string;
    category?: EmailCategory;
    isRead?: boolean;
    isStarred?: boolean;
    isArchived?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ emails: Email[]; total: number; page: number; pageSize: number }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    let results: Email[] = [];

    for (const email of this.emails.values()) {
      if (email.userId !== userId) continue;
      if (options.label && !email.labels.includes(options.label)) continue;
      if (options.category && email.category !== options.category) continue;
      if (options.isRead !== undefined && email.isRead !== options.isRead) continue;
      if (options.isStarred !== undefined && email.isStarred !== options.isStarred) continue;
      if (options.isArchived !== undefined && email.isArchived !== options.isArchived) continue;
      results.push(email);
    }

    // Sort by received date, newest first
    results.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    const total = results.length;
    const start = (page - 1) * pageSize;
    results = results.slice(start, start + pageSize);

    return { emails: results, total, page, pageSize };
  }

  async searchEmails(userId: string, search: SearchEmailRequest): Promise<{ emails: Email[]; total: number }> {
    const results: Email[] = [];
    const query = search.query.toLowerCase();

    for (const email of this.emails.values()) {
      if (email.userId !== userId) continue;

      let matches = false;

      // Full text search
      if (query) {
        matches = email.subject.toLowerCase().includes(query) ||
          email.bodyText.toLowerCase().includes(query) ||
          email.from.email.toLowerCase().includes(query) ||
          email.from.name?.toLowerCase().includes(query) ||
          email.to.some((r) => r.email.toLowerCase().includes(query) || r.name?.toLowerCase().includes(query));
      } else {
        matches = true;
      }

      // Apply filters
      if (matches && search.from) {
        matches = email.from.email.toLowerCase().includes(search.from.toLowerCase());
      }
      if (matches && search.to) {
        matches = email.to.some((r) => r.email.toLowerCase().includes(search.to!.toLowerCase()));
      }
      if (matches && search.subject) {
        matches = email.subject.toLowerCase().includes(search.subject.toLowerCase());
      }
      if (matches && search.hasAttachment !== undefined) {
        matches = search.hasAttachment ? email.attachments.length > 0 : email.attachments.length === 0;
      }
      if (matches && search.label) {
        matches = email.labels.includes(search.label);
      }
      if (matches && search.category) {
        matches = email.category === search.category;
      }
      if (matches && search.dateFrom) {
        matches = email.receivedAt >= new Date(search.dateFrom);
      }
      if (matches && search.dateTo) {
        matches = email.receivedAt <= new Date(search.dateTo);
      }
      if (matches && search.isRead !== undefined) {
        matches = email.isRead === search.isRead;
      }
      if (matches && search.isStarred !== undefined) {
        matches = email.isStarred === search.isStarred;
      }

      if (matches) results.push(email);
    }

    results.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    const page = search.page || 1;
    const pageSize = search.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return { emails: paged, total: results.length };
  }

  // --------------------------------------------------------------------------
  // Email Actions
  // --------------------------------------------------------------------------

  async replyToEmail(userId: string, emailId: string, body: string, replyAll: boolean = false): Promise<Email | null> {
    const original = this.emails.get(emailId);
    if (!original) return null;

    const to: EmailAddress[] = [original.from];
    const cc: EmailAddress[] = replyAll ? [...original.cc, ...original.to.filter((r) => r.email !== `${userId}@quantmail.app`)] : [];

    const reply = await this.composeEmail(userId, {
      to,
      cc,
      subject: original.subject.startsWith('Re: ') ? original.subject : `Re: ${original.subject}`,
      bodyText: body,
      inReplyTo: original.id,
    });

    await this.sendEmail(reply.id);
    return reply;
  }

  async forwardEmail(userId: string, emailId: string, to: EmailAddress[], additionalMessage?: string): Promise<Email | null> {
    const original = this.emails.get(emailId);
    if (!original) return null;

    const forwardBody = [
      additionalMessage || '',
      '\n---------- Forwarded message ----------',
      `From: ${original.from.name || ''} <${original.from.email}>`,
      `Date: ${original.receivedAt.toISOString()}`,
      `Subject: ${original.subject}`,
      `To: ${original.to.map((r) => r.email).join(', ')}`,
      '',
      original.bodyText,
    ].join('\n');

    const forward = await this.composeEmail(userId, {
      to,
      subject: original.subject.startsWith('Fwd: ') ? original.subject : `Fwd: ${original.subject}`,
      bodyText: forwardBody,
    });

    await this.sendEmail(forward.id);
    return forward;
  }

  async archiveEmail(emailId: string, userId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return false;
    email.isArchived = true;
    email.labels = email.labels.filter((l) => l !== 'inbox');
    if (!email.labels.includes('archive')) email.labels.push('archive');
    email.updatedAt = new Date();
    return true;
  }

  async deleteEmail(emailId: string, userId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return false;

    // Move to trash first, then permanently delete
    if (email.labels.includes('trash')) {
      this.emails.delete(emailId);
    } else {
      email.labels = ['trash'];
      email.updatedAt = new Date();
    }
    return true;
  }

  async markAsRead(emailId: string, userId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return false;
    email.isRead = true;
    email.updatedAt = new Date();
    return true;
  }

  async markAsUnread(emailId: string, userId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return false;
    email.isRead = false;
    email.updatedAt = new Date();
    return true;
  }

  async toggleStar(emailId: string, userId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return false;
    email.isStarred = !email.isStarred;
    email.updatedAt = new Date();
    return true;
  }

  async addLabel(emailId: string, userId: string, label: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return false;
    if (!email.labels.includes(label)) {
      email.labels.push(label);
      email.updatedAt = new Date();
    }
    return true;
  }

  async removeLabel(emailId: string, userId: string, label: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return false;
    email.labels = email.labels.filter((l) => l !== label);
    email.updatedAt = new Date();
    return true;
  }

  async moveToCategory(emailId: string, userId: string, category: EmailCategory): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.userId !== userId) return false;
    email.category = category;
    email.updatedAt = new Date();
    return true;
  }

  // --------------------------------------------------------------------------
  // Labels
  // --------------------------------------------------------------------------

  async getLabels(userId: string): Promise<EmailLabel[]> {
    const results: EmailLabel[] = [];
    for (const label of this.labels.values()) {
      if (label.userId === userId || label.isSystem) {
        // Count messages
        let messageCount = 0;
        let unreadCount = 0;
        for (const email of this.emails.values()) {
          if (email.userId === userId && email.labels.includes(label.name)) {
            messageCount++;
            if (!email.isRead) unreadCount++;
          }
        }
        results.push({ ...label, messageCount, unreadCount });
      }
    }
    return results;
  }

  async createLabel(userId: string, name: string, color: string): Promise<EmailLabel> {
    const labelId = this.generateId('label');
    const label: EmailLabel = {
      id: labelId,
      userId,
      name,
      color,
      isSystem: false,
      messageCount: 0,
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.labels.set(labelId, label);
    return label;
  }

  async deleteLabel(labelId: string, userId: string): Promise<boolean> {
    const label = this.labels.get(labelId);
    if (!label || label.userId !== userId || label.isSystem) return false;
    this.labels.delete(labelId);
    // Remove label from all emails
    for (const email of this.emails.values()) {
      if (email.userId === userId) {
        email.labels = email.labels.filter((l) => l !== label.name);
      }
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // Filters
  // --------------------------------------------------------------------------

  async getFilters(userId: string): Promise<EmailFilter[]> {
    const results: EmailFilter[] = [];
    for (const filter of this.filters.values()) {
      if (filter.userId === userId) results.push(filter);
    }
    return results.sort((a, b) => a.priority - b.priority);
  }

  async createFilter(userId: string, name: string, conditions: FilterCondition[], actions: FilterAction[]): Promise<EmailFilter> {
    const filterId = this.generateId('filter');
    const filter: EmailFilter = {
      id: filterId,
      userId,
      name,
      conditions,
      actions,
      isEnabled: true,
      priority: this.filters.size + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.filters.set(filterId, filter);
    return filter;
  }

  async deleteFilter(filterId: string, userId: string): Promise<boolean> {
    const filter = this.filters.get(filterId);
    if (!filter || filter.userId !== userId) return false;
    this.filters.delete(filterId);
    return true;
  }

  async applyFilters(email: Email): Promise<void> {
    for (const filter of this.filters.values()) {
      if (filter.userId !== email.userId || !filter.isEnabled) continue;

      const matches = filter.conditions.every((condition) => this.evaluateCondition(email, condition));
      if (matches) {
        for (const action of filter.actions) {
          this.applyAction(email, action);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Attachments
  // --------------------------------------------------------------------------

  async addAttachment(emailId: string, file: { filename: string; mimeType: string; size: number; data: string }): Promise<EmailAttachment> {
    const attachmentId = this.generateId('attach');
    const attachment: EmailAttachment = {
      id: attachmentId,
      emailId,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      url: `/api/emails/${emailId}/attachments/${attachmentId}`,
      isInline: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.attachments.set(attachmentId, attachment);

    const email = this.emails.get(emailId);
    if (email) {
      email.attachments.push(attachment);
      email.updatedAt = new Date();
    }

    return attachment;
  }

  async getAttachment(attachmentId: string): Promise<EmailAttachment | null> {
    return this.attachments.get(attachmentId) || null;
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  async getStats(userId: string): Promise<{
    totalEmails: number;
    unreadCount: number;
    sentCount: number;
    draftCount: number;
    spamCount: number;
    trashCount: number;
    storageUsed: number;
  }> {
    let totalEmails = 0;
    let unreadCount = 0;
    let sentCount = 0;
    let draftCount = 0;
    let spamCount = 0;
    let trashCount = 0;
    let storageUsed = 0;

    for (const email of this.emails.values()) {
      if (email.userId !== userId) continue;
      totalEmails++;
      if (!email.isRead) unreadCount++;
      if (email.labels.includes('sent')) sentCount++;
      if (email.isDraft) draftCount++;
      if (email.category === 'spam') spamCount++;
      if (email.labels.includes('trash')) trashCount++;
      storageUsed += email.bodyText.length + email.bodyHtml.length;
      for (const att of email.attachments) {
        storageUsed += att.size;
      }
    }

    return { totalEmails, unreadCount, sentCount, draftCount, spamCount, trashCount, storageUsed };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private initializeSystemLabels(): void {
    const systemLabels = [
      { name: 'inbox', color: '#4285f4' },
      { name: 'sent', color: '#34a853' },
      { name: 'draft', color: '#fbbc04' },
      { name: 'trash', color: '#ea4335' },
      { name: 'spam', color: '#ea4335' },
      { name: 'archive', color: '#9e9e9e' },
      { name: 'starred', color: '#fbbc04' },
      { name: 'important', color: '#fbbc04' },
    ];

    for (const label of systemLabels) {
      const id = `system_${label.name}`;
      this.labels.set(id, {
        id,
        userId: 'system',
        name: label.name,
        color: label.color,
        isSystem: true,
        messageCount: 0,
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private async deliverToInbox(email: Email, recipient: EmailAddress): Promise<void> {
    // Create a copy for the recipient
    const deliveredEmail: Email = {
      ...email,
      id: this.generateId('email'),
      userId: recipient.email.split('@')[0],
      isRead: false,
      labels: ['inbox'],
      status: 'delivered',
      receivedAt: new Date(),
    };
    this.emails.set(deliveredEmail.id, deliveredEmail);
    await this.applyFilters(deliveredEmail);
  }

  private findThreadForEmail(emailId: string): string | undefined {
    const email = this.emails.get(emailId);
    return email?.threadId;
  }

  private updateThread(threadId: string, email: Email): void {
    const existing = this.threads.get(threadId);
    if (existing) {
      existing.messageCount++;
      existing.lastMessageAt = email.receivedAt;
      existing.snippet = email.snippet;
      if (!existing.participants.some((p) => p.email === email.from.email)) {
        existing.participants.push(email.from);
      }
    } else {
      this.threads.set(threadId, {
        id: threadId,
        userId: email.userId,
        subject: email.subject,
        participants: [email.from, ...email.to],
        messageCount: 1,
        lastMessageAt: email.receivedAt,
        isRead: email.isRead,
        isStarred: email.isStarred,
        labels: email.labels,
        snippet: email.snippet,
        messages: [email],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private evaluateCondition(email: Email, condition: FilterCondition): boolean {
    let fieldValue: string = '';
    switch (condition.field) {
      case 'from': fieldValue = email.from.email; break;
      case 'to': fieldValue = email.to.map((r) => r.email).join(', '); break;
      case 'subject': fieldValue = email.subject; break;
      case 'body': fieldValue = email.bodyText; break;
      case 'hasAttachment': fieldValue = email.attachments.length > 0 ? 'true' : 'false'; break;
      case 'size': fieldValue = String(email.bodyText.length); break;
    }

    switch (condition.operator) {
      case 'contains': return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      case 'notContains': return !fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      case 'equals': return fieldValue.toLowerCase() === condition.value.toLowerCase();
      case 'startsWith': return fieldValue.toLowerCase().startsWith(condition.value.toLowerCase());
      case 'endsWith': return fieldValue.toLowerCase().endsWith(condition.value.toLowerCase());
      case 'greaterThan': return Number(fieldValue) > Number(condition.value);
      case 'lessThan': return Number(fieldValue) < Number(condition.value);
      default: return false;
    }
  }

  private applyAction(email: Email, action: FilterAction): void {
    switch (action.type) {
      case 'label':
        if (action.value && !email.labels.includes(action.value)) {
          email.labels.push(action.value);
        }
        break;
      case 'archive':
        email.isArchived = true;
        email.labels = email.labels.filter((l) => l !== 'inbox');
        break;
      case 'star':
        email.isStarred = true;
        break;
      case 'markRead':
        email.isRead = true;
        break;
      case 'delete':
        email.labels = ['trash'];
        break;
      case 'category':
        if (action.value) {
          email.category = action.value as EmailCategory;
        }
        break;
    }
  }

  private textToHtml(text: string): string {
    return `<div>${text.replace(/\n/g, '<br>')}</div>`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }
}
