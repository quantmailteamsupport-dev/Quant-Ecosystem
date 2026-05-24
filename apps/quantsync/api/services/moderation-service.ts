// ============================================================================
// QuantSync - Moderation Service
// Content moderation, spam detection, reports, auto-mod
// ============================================================================

import type { Report, ModerationAction, ReportReason, Post, Comment } from '../../src/types';

interface SpamSignal {
  type: 'repetition' | 'link_spam' | 'new_account' | 'velocity' | 'keyword';
  weight: number;
  detail: string;
}

interface ContentAnalysis {
  isSpam: boolean;
  spamScore: number;
  toxicityScore: number;
  signals: SpamSignal[];
  suggestedAction: 'approve' | 'flag' | 'remove' | 'shadowban';
}

class ModerationService {
  private reports: Map<string, Report> = new Map();
  private actions: Map<string, ModerationAction[]> = new Map();
  private bannedUsers: Map<string, { until: number; reason: string }> = new Map();
  private shadowBanned: Set<string> = new Set();
  private spamPatterns: RegExp[] = [
    /\b(buy|sell|discount|free|click here|act now|limited time)\b/gi,
    /(https?:\/\/[^\s]+){3,}/gi, // Multiple links
    /(.)\1{10,}/g, // Excessive character repetition
    /[A-Z]{20,}/g, // Excessive caps
  ];
  private toxicKeywords: string[] = [
    'hate', 'kill', 'threat', 'slur', 'harass',
  ];
  private userPostVelocity: Map<string, number[]> = new Map();

  // --------------------------------------------------------------------------
  // Content Analysis
  // --------------------------------------------------------------------------

  analyzeContent(content: string, authorId: string, accountAge?: number): ContentAnalysis {
    const signals: SpamSignal[] = [];
    let spamScore = 0;
    let toxicityScore = 0;

    // Check spam patterns
    for (const pattern of this.spamPatterns) {
      pattern.lastIndex = 0;
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        signals.push({ type: 'keyword', weight: 0.3, detail: `Matched spam pattern: ${pattern.source.substring(0, 30)}` });
        spamScore += 0.3;
      }
    }

    // Check post velocity (rate limiting)
    const velocity = this.getUserVelocity(authorId);
    if (velocity > 10) { // More than 10 posts per minute
      signals.push({ type: 'velocity', weight: 0.5, detail: `High post velocity: ${velocity} posts/min` });
      spamScore += 0.5;
    }

    // New account check
    if (accountAge !== undefined && accountAge < 1) { // Less than 1 day old
      signals.push({ type: 'new_account', weight: 0.2, detail: 'Account less than 1 day old' });
      spamScore += 0.2;
    }

    // Repetition detection
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 5 && uniqueWords.size / words.length < 0.3) {
      signals.push({ type: 'repetition', weight: 0.4, detail: 'Low word diversity - potential spam' });
      spamScore += 0.4;
    }

    // Link spam detection
    const links = content.match(/https?:\/\/[^\s]+/g) || [];
    if (links.length > 3) {
      signals.push({ type: 'link_spam', weight: 0.4, detail: `${links.length} links detected` });
      spamScore += 0.4;
    }

    // Toxicity check
    const lowerContent = content.toLowerCase();
    for (const keyword of this.toxicKeywords) {
      if (lowerContent.includes(keyword)) {
        toxicityScore += 0.2;
      }
    }

    // Determine suggested action
    let suggestedAction: ContentAnalysis['suggestedAction'] = 'approve';
    if (spamScore >= 0.8 || toxicityScore >= 0.8) {
      suggestedAction = 'remove';
    } else if (spamScore >= 0.5 || toxicityScore >= 0.5) {
      suggestedAction = 'flag';
    } else if (spamScore >= 0.3) {
      suggestedAction = 'shadowban';
    }

    return {
      isSpam: spamScore >= 0.5,
      spamScore: Math.min(spamScore, 1),
      toxicityScore: Math.min(toxicityScore, 1),
      signals,
      suggestedAction,
    };
  }

  // --------------------------------------------------------------------------
  // Velocity Tracking
  // --------------------------------------------------------------------------

  private getUserVelocity(userId: string): number {
    const timestamps = this.userPostVelocity.get(userId) || [];
    const oneMinuteAgo = Date.now() - 60000;
    const recent = timestamps.filter(t => t > oneMinuteAgo);
    this.userPostVelocity.set(userId, recent);
    return recent.length;
  }

  recordPost(userId: string): void {
    const timestamps = this.userPostVelocity.get(userId) || [];
    timestamps.push(Date.now());
    this.userPostVelocity.set(userId, timestamps);
  }

  // --------------------------------------------------------------------------
  // Reports
  // --------------------------------------------------------------------------

  createReport(report: Omit<Report, 'id' | 'status' | 'createdAt'>): Report {
    const newReport: Report = {
      ...report,
      id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.reports.set(newReport.id, newReport);
    return newReport;
  }

  getReport(id: string): Report | undefined {
    return this.reports.get(id);
  }

  getReportsByTarget(targetId: string): Report[] {
    return Array.from(this.reports.values()).filter(r => r.targetId === targetId);
  }

  getPendingReports(limit: number = 50): Report[] {
    return Array.from(this.reports.values())
      .filter(r => r.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  resolveReport(reportId: string, moderatorId: string, resolution: string, action?: 'dismiss' | 'resolve'): Report | undefined {
    const report = this.reports.get(reportId);
    if (!report) return undefined;
    report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    report.moderatorId = moderatorId;
    report.resolution = resolution;
    report.resolvedAt = new Date().toISOString();
    return report;
  }

  // --------------------------------------------------------------------------
  // Moderation Actions
  // --------------------------------------------------------------------------

  takeAction(action: Omit<ModerationAction, 'id' | 'createdAt'>): ModerationAction {
    const modAction: ModerationAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString(),
    };

    const existing = this.actions.get(action.targetId) || [];
    existing.push(modAction);
    this.actions.set(action.targetId, existing);

    // Apply ban/mute
    if (action.action === 'ban' && action.targetType === 'user') {
      const duration = action.duration || 24; // Default 24 hours
      this.bannedUsers.set(action.targetId, {
        until: Date.now() + duration * 3600000,
        reason: action.reason,
      });
    }

    return modAction;
  }

  isUserBanned(userId: string): boolean {
    const ban = this.bannedUsers.get(userId);
    if (!ban) return false;
    if (ban.until < Date.now()) {
      this.bannedUsers.delete(userId);
      return false;
    }
    return true;
  }

  isShadowBanned(userId: string): boolean {
    return this.shadowBanned.has(userId);
  }

  shadowBan(userId: string): void {
    this.shadowBanned.add(userId);
  }

  removeShadowBan(userId: string): void {
    this.shadowBanned.delete(userId);
  }

  getActionHistory(targetId: string): ModerationAction[] {
    return this.actions.get(targetId) || [];
  }

  // --------------------------------------------------------------------------
  // Auto-Mod Rules
  // --------------------------------------------------------------------------

  shouldAutoRemove(content: string, authorId: string): boolean {
    if (this.isUserBanned(authorId)) return true;
    const analysis = this.analyzeContent(content, authorId);
    return analysis.suggestedAction === 'remove';
  }

  shouldFlagForReview(content: string, authorId: string): boolean {
    const analysis = this.analyzeContent(content, authorId);
    return analysis.suggestedAction === 'flag';
  }
}

export const moderationService = new ModerationService();
export default ModerationService;
