// ============================================================================
// QuantMail API - AI Service
// AI email features using packages/ai
// ============================================================================

import type {
  AIComposeRequest,
  AISummarizeRequest,
  AICategorizeRequest,
  AIPriorityRequest,
  MeetingExtraction,
  Email,
  EmailCategory,
  EmailPriority,
} from '../../src/types';

// ----------------------------------------------------------------------------
// AI Service
// ----------------------------------------------------------------------------

export class AIService {
  private compositionCache: Map<string, string> = new Map();
  private summaryCache: Map<string, string> = new Map();

  // --------------------------------------------------------------------------
  // Smart Compose
  // --------------------------------------------------------------------------

  async smartCompose(userId: string, request: AIComposeRequest): Promise<{
    subject: string;
    body: string;
    suggestions: string[];
  }> {
    const tone = request.tone || 'professional';
    const length = request.length || 'medium';

    // Generate email based on instructions and context
    const body = this.generateEmailBody(request.instructions, tone, length, request.context);
    const subject = this.generateSubject(request.instructions, request.context?.subject);

    // Generate alternative suggestions
    const suggestions = this.generateAlternatives(request.instructions, tone);

    return { subject, body, suggestions };
  }

  async autocomplete(userId: string, partialText: string, context: { subject?: string; recipients?: string[] }): Promise<string[]> {
    // Generate completions based on partial text
    const completions: string[] = [];
    const lastSentence = partialText.split('.').pop()?.trim() || '';

    if (lastSentence.length < 5) return completions;

    // Common professional completions
    const templates: Record<string, string[]> = {
      'thank': ['Thank you for your prompt response.', 'Thanks for letting me know.', 'Thank you for the update.'],
      'please': ['Please let me know if you have any questions.', 'Please feel free to reach out.', 'Please find the attached document.'],
      'look': ['Looking forward to hearing from you.', 'Looking forward to our meeting.', 'Looking forward to working together.'],
      'hope': ['Hope this helps!', 'Hope you are doing well.', 'Hope to connect soon.'],
      'let me': ['Let me know if you need anything else.', 'Let me check and get back to you.', 'Let me review this and follow up.'],
      'attach': ['Attached please find the requested documents.', 'I have attached the files for your review.'],
      'follow': ['Following up on our previous conversation.', 'Following up regarding the proposal.'],
    };

    const lowerText = lastSentence.toLowerCase();
    for (const [key, options] of Object.entries(templates)) {
      if (lowerText.includes(key)) {
        completions.push(...options);
      }
    }

    return completions.slice(0, 3);
  }

  // --------------------------------------------------------------------------
  // Email Summarization
  // --------------------------------------------------------------------------

  async summarizeEmail(userId: string, email: Email): Promise<string> {
    const cached = this.summaryCache.get(email.id);
    if (cached) return cached;

    // Extract key information
    const keyPoints: string[] = [];
    const sentences = email.bodyText.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    // Take first sentence as intro
    if (sentences.length > 0) {
      keyPoints.push(sentences[0].trim());
    }

    // Look for action items
    const actionKeywords = ['please', 'need', 'required', 'deadline', 'asap', 'urgent', 'by'];
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (actionKeywords.some((kw) => lower.includes(kw)) && !keyPoints.includes(sentence.trim())) {
        keyPoints.push(sentence.trim());
      }
    }

    // Look for dates/times
    const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi;
    for (const sentence of sentences) {
      if (datePattern.test(sentence) && !keyPoints.includes(sentence.trim())) {
        keyPoints.push(sentence.trim());
        datePattern.lastIndex = 0;
      }
    }

    const summary = keyPoints.length > 0
      ? keyPoints.slice(0, 3).join('. ') + '.'
      : `Email from ${email.from.name || email.from.email} regarding "${email.subject}".`;

    this.summaryCache.set(email.id, summary);
    return summary;
  }

  async summarizeThread(userId: string, emails: Email[]): Promise<string> {
    if (emails.length === 0) return 'Empty thread.';

    const participants = [...new Set(emails.map((e) => e.from.name || e.from.email))];
    const firstEmail = emails[0];
    const lastEmail = emails[emails.length - 1];

    const summaryParts = [
      `Thread: "${firstEmail.subject}" with ${participants.length} participants (${participants.slice(0, 3).join(', ')}${participants.length > 3 ? '...' : ''}).`,
      `${emails.length} messages over ${this.formatDuration(firstEmail.receivedAt, lastEmail.receivedAt)}.`,
    ];

    // Summarize last message
    const lastSummary = await this.summarizeEmail(userId, lastEmail);
    summaryParts.push(`Latest: ${lastSummary}`);

    return summaryParts.join(' ');
  }

  // --------------------------------------------------------------------------
  // Auto-Categorization
  // --------------------------------------------------------------------------

  async categorizeEmails(userId: string, emails: Email[]): Promise<Map<string, EmailCategory>> {
    const categories = new Map<string, EmailCategory>();

    for (const email of emails) {
      const category = this.detectCategory(email);
      categories.set(email.id, category);
    }

    return categories;
  }

  private detectCategory(email: Email): EmailCategory {
    const from = email.from.email.toLowerCase();
    const subject = email.subject.toLowerCase();
    const body = email.bodyText.toLowerCase();

    // Spam indicators
    const spamIndicators = ['unsubscribe', 'click here', 'limited time', 'act now', 'free trial', 'buy now'];
    if (spamIndicators.filter((i) => body.includes(i)).length >= 3) return 'spam';

    // Social notifications
    const socialDomains = ['facebook', 'twitter', 'linkedin', 'instagram', 'tiktok', 'discord'];
    if (socialDomains.some((d) => from.includes(d))) return 'social';

    // Promotions
    const promoIndicators = ['sale', 'discount', 'offer', 'promo', 'deal', '%off', 'limited offer'];
    if (promoIndicators.some((i) => subject.includes(i) || body.includes(i))) return 'promotions';

    // Updates (automated notifications)
    const updateIndicators = ['noreply', 'no-reply', 'notification', 'automated', 'alert', 'status update'];
    if (updateIndicators.some((i) => from.includes(i) || subject.includes(i))) return 'updates';

    // Forums
    const forumIndicators = ['digest', 'thread', 'discussion', 'forum', 'community', 'mailing list'];
    if (forumIndicators.some((i) => subject.includes(i) || body.includes(i))) return 'forums';

    return 'primary';
  }

  // --------------------------------------------------------------------------
  // Priority Inbox
  // --------------------------------------------------------------------------

  async detectPriority(userId: string, emails: Email[]): Promise<Map<string, EmailPriority>> {
    const priorities = new Map<string, EmailPriority>();

    for (const email of emails) {
      const priority = this.computePriority(email);
      priorities.set(email.id, priority);
    }

    return priorities;
  }

  private computePriority(email: Email): EmailPriority {
    let score = 50; // Base score (normal)

    // High priority indicators
    const highIndicators = ['urgent', 'asap', 'immediately', 'critical', 'important', 'deadline', 'overdue'];
    const subject = email.subject.toLowerCase();
    const body = email.bodyText.toLowerCase();

    for (const indicator of highIndicators) {
      if (subject.includes(indicator)) score += 20;
      if (body.includes(indicator)) score += 10;
    }

    // Direct mention or sole recipient
    if (email.to.length === 1) score += 10;

    // Headers indicating priority
    if (email.headers['X-Priority'] === '1' || email.headers['Importance'] === 'high') {
      score += 25;
    }

    // Low priority indicators
    const lowIndicators = ['newsletter', 'digest', 'noreply', 'unsubscribe', 'marketing'];
    for (const indicator of lowIndicators) {
      if (email.from.email.toLowerCase().includes(indicator) || body.includes(indicator)) {
        score -= 20;
      }
    }

    // CC'd rather than TO'd suggests lower priority
    if (email.to.length > 5) score -= 15;

    if (score >= 70) return 'high';
    if (score <= 30) return 'low';
    return 'normal';
  }

  // --------------------------------------------------------------------------
  // Meeting Extraction
  // --------------------------------------------------------------------------

  async extractMeetings(userId: string, email: Email): Promise<MeetingExtraction[]> {
    const meetings: MeetingExtraction[] = [];
    const body = email.bodyText;

    // Pattern: date + time detection
    const dateTimePatterns = [
      /(?:on|at|for)\s+(\w+(?:day)?),?\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:am|pm)?)/gi,
      /(?:meeting|call|sync|standup|review)\s+(?:on|at|for)?\s*(\w+\s+\d{1,2}(?:,\s*\d{4})?)\s*(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/gi,
    ];

    for (const pattern of dateTimePatterns) {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        const title = this.extractMeetingTitle(body, match.index);
        const attendees = this.extractAttendees(body, email);

        meetings.push({
          title: title || `Meeting: ${email.subject}`,
          dateTime: match[0],
          duration: 60, // Default 1 hour
          location: this.extractLocation(body),
          attendees,
          agenda: this.extractAgenda(body),
          confidence: 0.75,
        });
      }
    }

    // Also check for calendar invite patterns
    if (body.includes('invite') || body.includes('calendar') || body.includes('schedule')) {
      const titleMatch = body.match(/(?:subject|title|topic):\s*(.+?)(?:\n|$)/i);
      if (titleMatch && meetings.length === 0) {
        meetings.push({
          title: titleMatch[1].trim(),
          dateTime: new Date().toISOString(),
          duration: 60,
          attendees: this.extractAttendees(body, email),
          confidence: 0.5,
        });
      }
    }

    return meetings;
  }

  // --------------------------------------------------------------------------
  // Reply Suggestions
  // --------------------------------------------------------------------------

  async generateReplySuggestions(userId: string, email: Email): Promise<string[]> {
    const suggestions: string[] = [];
    const body = email.bodyText.toLowerCase();

    // Detect email type and generate appropriate responses
    if (body.includes('meeting') || body.includes('schedule') || body.includes('available')) {
      suggestions.push('That time works for me. I will be there!');
      suggestions.push('Unfortunately I have a conflict at that time. Could we reschedule?');
      suggestions.push('Let me check my calendar and get back to you.');
    } else if (body.includes('question') || body.includes('?')) {
      suggestions.push('Great question! Let me look into this and get back to you.');
      suggestions.push('Thanks for reaching out. Here is what I think...');
      suggestions.push('I will need to check on this. Give me a day to research.');
    } else if (body.includes('thank') || body.includes('appreciate')) {
      suggestions.push('You are welcome! Happy to help.');
      suggestions.push('Glad I could assist. Let me know if you need anything else.');
      suggestions.push('No problem at all!');
    } else if (body.includes('update') || body.includes('status') || body.includes('progress')) {
      suggestions.push('Thanks for the update! Everything looks good.');
      suggestions.push('Noted. Let me know if there are any blockers.');
      suggestions.push('Thanks for keeping me in the loop.');
    } else {
      suggestions.push('Thanks for your email. I will review and respond in detail shortly.');
      suggestions.push('Received, thank you. I will follow up soon.');
      suggestions.push('Got it! I will take a look and get back to you.');
    }

    return suggestions;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private generateEmailBody(instructions: string, tone: string, length: string, context?: { recipient?: string; subject?: string; previousEmails?: string[] }): string {
    const greetings: Record<string, string[]> = {
      professional: ['Dear', 'Hello', 'Good morning'],
      casual: ['Hey', 'Hi', 'Hey there'],
      formal: ['Dear Sir/Madam', 'Dear', 'Respected'],
      friendly: ['Hi', 'Hey', 'Hello'],
    };

    const closings: Record<string, string[]> = {
      professional: ['Best regards', 'Kind regards', 'Sincerely'],
      casual: ['Cheers', 'Thanks', 'Talk soon'],
      formal: ['Yours faithfully', 'Respectfully', 'Yours sincerely'],
      friendly: ['Best', 'Thanks!', 'Cheers'],
    };

    const greeting = greetings[tone]?.[0] || 'Hello';
    const closing = closings[tone]?.[0] || 'Best regards';
    const recipient = context?.recipient || 'there';

    const paragraphs: string[] = [`${greeting} ${recipient},`, '', instructions];

    if (length === 'long') {
      paragraphs.push('', 'Please do not hesitate to reach out if you have any questions or need further clarification.');
    }

    paragraphs.push('', `${closing},`, '[Your Name]');

    return paragraphs.join('\n');
  }

  private generateSubject(instructions: string, existingSubject?: string): string {
    if (existingSubject) return existingSubject;

    // Extract key topic from instructions
    const words = instructions.split(' ').filter((w) => w.length > 3);
    if (words.length >= 3) {
      return words.slice(0, 5).join(' ');
    }
    return 'No Subject';
  }

  private generateAlternatives(instructions: string, tone: string): string[] {
    return [
      `Would you like a more ${tone === 'formal' ? 'casual' : 'formal'} version?`,
      'Here is a shorter alternative: ' + instructions.substring(0, 50) + '...',
      'Consider adding a specific call-to-action for better engagement.',
    ];
  }

  private extractMeetingTitle(body: string, matchIndex: number): string | null {
    // Look for meeting title before the date
    const beforeMatch = body.substring(Math.max(0, matchIndex - 100), matchIndex);
    const titleMatch = beforeMatch.match(/(?:meeting|call|sync|review|standup|discussion)(?:\s+(?:about|for|regarding))?\s*:?\s*(.+?)$/i);
    return titleMatch ? titleMatch[1].trim() : null;
  }

  private extractAttendees(body: string, email: Email): string[] {
    const attendees = [email.from.email, ...email.to.map((r) => r.email)];
    // Look for additional emails in body
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
    let match;
    while ((match = emailPattern.exec(body)) !== null) {
      if (!attendees.includes(match[0])) {
        attendees.push(match[0]);
      }
    }
    return [...new Set(attendees)];
  }

  private extractLocation(body: string): string | undefined {
    const locationPatterns = [
      /(?:location|where|room|venue):\s*(.+?)(?:\n|$)/i,
      /(?:at|in)\s+(room\s+\w+|building\s+\w+|conference\s+room\s+\w+)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = body.match(pattern);
      if (match) return match[1].trim();
    }
    return undefined;
  }

  private extractAgenda(body: string): string | undefined {
    const agendaMatch = body.match(/(?:agenda|topics?|discuss):\s*([\s\S]*?)(?:\n\n|\n(?=[A-Z]))/i);
    return agendaMatch ? agendaMatch[1].trim() : undefined;
  }

  private formatDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'a few minutes';
  }
}
