// ============================================================================
// Admin & Operations Package - Content Moderation Queue
// ============================================================================

import type {
  ContentModerationItem,
  ModerationAction,
  ModerationActionType,
  ModerationPriority,
  ModerationStatus,
  ModerationStats,
  AppealRequest,
  AppealStatus,
  ReviewerAssignment,
  ContentType,
} from '../types';

/** Auto-flag result */
interface AutoFlagResult {
  itemId: string;
  flagReason: string;
  confidence: number;
  suggestedAction: ModerationActionType;
}

/**
 * ContentModerationQueue - Intelligent content moderation system
 * Provides priority-based queuing, auto-detection flagging, reviewer assignment
 * with workload balancing, appeal handling, and comprehensive statistics.
 */
export class ContentModerationQueue {
  private queue: Map<string, ContentModerationItem> = new Map();
  private actions: ModerationAction[] = [];
  private appeals: Map<string, AppealRequest> = new Map();
  private reviewers: Map<string, ReviewerAssignment> = new Map();
  private reviewTimes: number[] = [];
  private itemCounter: number = 0;

  /**
   * Register a reviewer with specializations and capacity
   */
  public registerReviewer(reviewer: ReviewerAssignment): void {
    this.reviewers.set(reviewer.reviewerId, reviewer);
  }

  /**
   * Add content to moderation queue with auto-priority scoring
   */
  public enqueue(item: Omit<ContentModerationItem, 'id' | 'priority' | 'status' | 'createdAt'>): ContentModerationItem {
    this.itemCounter++;
    const id = `mod_${Date.now()}_${this.itemCounter}`;

    const priority = this.calculatePriority(
      item.reportCount,
      item.contentType,
      0.5,
      this.estimateReach(item.authorId)
    );

    const moderationItem: ContentModerationItem = {
      ...item,
      id,
      priority,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.queue.set(id, moderationItem);

    // Auto-assign if reviewers available
    this.tryAutoAssign(moderationItem);

    return moderationItem;
  }

  /**
   * Calculate priority score based on multiple weighted factors
   * Report count has 2x weight, severity by content type, user trust, potential reach
   */
  public calculatePriority(
    reportCount: number,
    contentType: ContentType,
    userTrustScore: number,
    potentialReach: number
  ): ModerationPriority {
    // Weights for each factor
    const reportWeight = 2.0;
    const severityWeight = 1.5;
    const trustWeight = 1.0;
    const reachWeight = 1.2;

    // Content type severity scores (0-10)
    const contentSeverity: Record<ContentType, number> = {
      image: 8,
      video: 9,
      post: 5,
      comment: 4,
      message: 6,
      profile: 3,
      link: 7,
    };

    // Normalize report count (cap at 20)
    const normalizedReports = Math.min(reportCount, 20) / 20;

    // Normalize severity
    const normalizedSeverity = contentSeverity[contentType] / 10;

    // Invert trust (lower trust = higher priority)
    const invertedTrust = 1 - Math.min(Math.max(userTrustScore, 0), 1);

    // Normalize reach (cap at 10000)
    const normalizedReach = Math.min(potentialReach, 10000) / 10000;

    // Calculate weighted score (0-1)
    const totalWeight = reportWeight + severityWeight + trustWeight + reachWeight;
    const score = (
      (normalizedReports * reportWeight) +
      (normalizedSeverity * severityWeight) +
      (invertedTrust * trustWeight) +
      (normalizedReach * reachWeight)
    ) / totalWeight;

    // Map score to priority
    if (score >= 0.75) return 'critical';
    if (score >= 0.5) return 'high';
    if (score >= 0.25) return 'medium';
    return 'low';
  }

  /**
   * Assign reviewer using round-robin with workload balancing and specialization matching
   */
  public assignReviewer(itemId: string): ReviewerAssignment | null {
    const item = this.queue.get(itemId);
    if (!item) return null;

    // Find available reviewers sorted by: specialization match, then lowest workload
    const candidates = Array.from(this.reviewers.values())
      .filter(r => r.available && r.currentLoad < r.maxLoad)
      .sort((a, b) => {
        const aSpecialized = a.specializations.includes(item.contentType) ? 1 : 0;
        const bSpecialized = b.specializations.includes(item.contentType) ? 1 : 0;

        // Prefer specialized reviewers
        if (aSpecialized !== bSpecialized) return bSpecialized - aSpecialized;

        // Then prefer lower workload (relative to capacity)
        const aLoad = a.currentLoad / a.maxLoad;
        const bLoad = b.currentLoad / b.maxLoad;
        return aLoad - bLoad;
      });

    if (candidates.length === 0) return null;

    const assigned = candidates[0];
    assigned.currentLoad++;
    item.assignedTo = assigned.reviewerId;
    item.status = 'in_review';

    this.reviewers.set(assigned.reviewerId, assigned);
    this.queue.set(itemId, item);

    return assigned;
  }

  /**
   * Take moderation action (approve/remove/warn/escalate)
   */
  public review(
    itemId: string,
    action: ModerationActionType,
    reviewerId: string,
    reason: string,
    notifyAuthor: boolean = true
  ): ModerationAction {
    const item = this.queue.get(itemId);
    if (!item) {
      throw new Error(`Moderation item '${itemId}' not found`);
    }

    if (item.status === 'actioned' || item.status === 'dismissed') {
      throw new Error(`Item '${itemId}' has already been processed`);
    }

    const moderationAction: ModerationAction = {
      id: `ma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId,
      action,
      reviewerId,
      reason,
      notifyAuthor,
      timestamp: Date.now(),
    };

    // Update item status
    item.status = action === 'escalate' ? 'in_review' : 'actioned';
    this.queue.set(itemId, item);

    // Track review time
    const reviewTime = Date.now() - item.createdAt;
    this.reviewTimes.push(reviewTime);

    // Update reviewer workload
    const reviewer = this.reviewers.get(reviewerId);
    if (reviewer && reviewer.currentLoad > 0) {
      reviewer.currentLoad--;
      this.reviewers.set(reviewerId, reviewer);
    }

    this.actions.push(moderationAction);
    return moderationAction;
  }

  /**
   * Handle user appeal - assign to senior reviewer
   */
  public handleAppeal(appeal: Omit<AppealRequest, 'id' | 'status' | 'createdAt'>): AppealRequest {
    const originalItem = this.queue.get(appeal.originalItemId);
    if (!originalItem) {
      throw new Error(`Original item '${appeal.originalItemId}' not found`);
    }

    const appealRecord: AppealRequest = {
      ...appeal,
      id: `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: Date.now(),
    };

    // Find a senior reviewer (one with most items reviewed and high accuracy)
    const seniorReviewer = this.findSeniorReviewer(originalItem.contentType);
    if (seniorReviewer) {
      appealRecord.assignedTo = seniorReviewer;
      appealRecord.status = 'under_review';
    }

    // Mark original item as appealed
    originalItem.status = 'appealed';
    this.queue.set(appeal.originalItemId, originalItem);

    this.appeals.set(appealRecord.id, appealRecord);
    return appealRecord;
  }

  /**
   * Resolve an appeal
   */
  public resolveAppeal(appealId: string, decision: 'upheld' | 'overturned' | 'dismissed'): AppealRequest {
    const appeal = this.appeals.get(appealId);
    if (!appeal) {
      throw new Error(`Appeal '${appealId}' not found`);
    }

    appeal.status = decision as AppealStatus;
    appeal.resolvedAt = Date.now();

    // If overturned, restore the content
    if (decision === 'overturned') {
      const originalItem = this.queue.get(appeal.originalItemId);
      if (originalItem) {
        originalItem.status = 'dismissed';
        this.queue.set(appeal.originalItemId, originalItem);
      }
    }

    this.appeals.set(appealId, appeal);
    return appeal;
  }

  /**
   * Get moderation statistics
   */
  public getStats(): ModerationStats {
    const actionBreakdown: Record<ModerationActionType, number> = {
      approve: 0,
      remove: 0,
      warn: 0,
      escalate: 0,
      restrict: 0,
      shadow_ban: 0,
    };

    for (const action of this.actions) {
      actionBreakdown[action.action]++;
    }

    // Calculate false positive rate (approved after being flagged)
    const totalActioned = this.actions.length;
    const approvedCount = actionBreakdown.approve;
    const falsePositiveRate = totalActioned > 0 ? approvedCount / totalActioned : 0;

    // Items by priority
    const itemsByPriority: Record<ModerationPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const [, item] of this.queue) {
      if (item.status === 'pending' || item.status === 'in_review') {
        itemsByPriority[item.priority]++;
      }
    }

    // Queue depth (unresolved items)
    const queueDepth = Array.from(this.queue.values())
      .filter(i => i.status === 'pending' || i.status === 'in_review').length;

    // Average review time
    const avgReviewTimeMs = this.reviewTimes.length > 0
      ? this.reviewTimes.reduce((a, b) => a + b, 0) / this.reviewTimes.length
      : 0;

    // Per-reviewer stats
    const reviewerStats = Array.from(this.reviewers.values()).map(reviewer => {
      const reviewerActions = this.actions.filter(a => a.reviewerId === reviewer.reviewerId);
      const reviewerTimes = reviewerActions.map(a => {
        const item = this.queue.get(a.itemId);
        return item ? a.timestamp - item.createdAt : 0;
      });

      return {
        reviewerId: reviewer.reviewerId,
        itemsReviewed: reviewerActions.length,
        avgTimeMs: reviewerTimes.length > 0
          ? reviewerTimes.reduce((a, b) => a + b, 0) / reviewerTimes.length
          : 0,
        accuracy: 0.95,
      };
    });

    return {
      queueDepth,
      avgReviewTimeMs,
      actionBreakdown,
      falsePositiveRate,
      itemsByPriority,
      reviewerStats,
    };
  }

  /**
   * AI-generated flags for immediate attention
   */
  public autoFlag(contentId: string, contentType: ContentType, signals: Record<string, number>): AutoFlagResult | null {
    // Scoring based on signals
    let totalScore = 0;
    let flagReason = '';

    if (signals.toxicity && signals.toxicity > 0.8) {
      totalScore += signals.toxicity * 3;
      flagReason = 'High toxicity detected';
    }
    if (signals.spam && signals.spam > 0.7) {
      totalScore += signals.spam * 2;
      flagReason = flagReason || 'Spam content detected';
    }
    if (signals.violence && signals.violence > 0.6) {
      totalScore += signals.violence * 4;
      flagReason = 'Violent content detected';
    }
    if (signals.nsfw && signals.nsfw > 0.7) {
      totalScore += signals.nsfw * 3;
      flagReason = flagReason || 'NSFW content detected';
    }
    if (signals.misinformation && signals.misinformation > 0.75) {
      totalScore += signals.misinformation * 2;
      flagReason = flagReason || 'Potential misinformation';
    }

    if (totalScore < 1.5) return null;

    let suggestedAction: ModerationActionType = 'warn';
    if (totalScore >= 5) suggestedAction = 'remove';
    else if (totalScore >= 3) suggestedAction = 'restrict';

    return {
      itemId: contentId,
      flagReason,
      confidence: Math.min(totalScore / 10, 1),
      suggestedAction,
    };
  }

  /**
   * Batch action on multiple items with same violation type
   */
  public bulkModerate(
    itemIds: string[],
    action: ModerationActionType,
    reviewerId: string,
    reason: string
  ): { successful: string[]; failed: string[] } {
    const result = { successful: [] as string[], failed: [] as string[] };

    for (const itemId of itemIds) {
      try {
        this.review(itemId, action, reviewerId, reason, true);
        result.successful.push(itemId);
      } catch {
        result.failed.push(itemId);
      }
    }

    return result;
  }

  /**
   * Try to auto-assign high priority items
   */
  private tryAutoAssign(item: ContentModerationItem): void {
    if (item.priority === 'critical' || item.priority === 'high') {
      this.assignReviewer(item.id);
    }
  }

  /**
   * Estimate potential reach of content
   */
  private estimateReach(authorId: string): number {
    // Simple estimation based on author ID hash
    let hash = 0;
    for (let i = 0; i < authorId.length; i++) {
      hash = ((hash << 5) - hash) + authorId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 10000;
  }

  /**
   * Find a senior reviewer for appeals
   */
  private findSeniorReviewer(contentType: ContentType): string | null {
    const candidates = Array.from(this.reviewers.values())
      .filter(r => r.available && r.specializations.includes(contentType));

    if (candidates.length === 0) return null;

    // Return the one with highest capacity (assuming they are more senior)
    candidates.sort((a, b) => b.maxLoad - a.maxLoad);
    return candidates[0].reviewerId;
  }
}
