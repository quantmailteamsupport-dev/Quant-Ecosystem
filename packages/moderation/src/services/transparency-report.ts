// ============================================================================
// Moderation - Transparency Report Generator
// Generates transparency reports with moderation statistics
// ============================================================================

import type { AppealRecord, ModerationResult, TransparencyReport } from '../types';

/**
 * TransparencyReportGenerator - Generates transparency reports
 *
 * Aggregates moderation actions and appeal outcomes into structured
 * reports for a given time period.
 */
export class TransparencyReportGenerator {
  private moderationActions: ModerationResult[];
  private appealRecords: AppealRecord[];

  constructor() {
    this.moderationActions = [];
    this.appealRecords = [];
  }

  /** Record a moderation action for reporting */
  recordAction(result: ModerationResult): void {
    this.moderationActions.push(result);
  }

  /** Record an appeal for reporting */
  recordAppeal(record: AppealRecord): void {
    this.appealRecords.push(record);
  }

  /** Generate a transparency report for the given time range */
  generate(startDate: number, endDate: number): TransparencyReport {
    const filteredActions = this.moderationActions.filter(
      (a) => a.createdAt >= startDate && a.createdAt <= endDate,
    );

    const filteredAppeals = this.appealRecords.filter(
      (a) => a.createdAt >= startDate && a.createdAt <= endDate,
    );

    const actionsByCategory: Record<string, number> = {};
    for (const action of filteredActions) {
      for (const cat of action.categories) {
        if (cat.detected) {
          actionsByCategory[cat.category] = (actionsByCategory[cat.category] ?? 0) + 1;
        }
      }
    }

    const approvedAppeals = filteredAppeals.filter((a) => a.status === 'approved');
    const deniedAppeals = filteredAppeals.filter((a) => a.status === 'denied');
    const resolvedAppeals = filteredAppeals.filter((a) => a.resolvedAt !== undefined);

    const totalResolutionTime = resolvedAppeals.reduce(
      (sum, a) => sum + ((a.resolvedAt ?? a.createdAt) - a.createdAt),
      0,
    );

    const avgResolutionTime =
      resolvedAppeals.length > 0 ? totalResolutionTime / resolvedAppeals.length : 0;

    // Sort categories by count descending
    const topCategories = Object.entries(actionsByCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      startDate,
      endDate,
      totalActions: filteredActions.length,
      actionsByCategory,
      appealStats: {
        submitted: filteredAppeals.length,
        approved: approvedAppeals.length,
        denied: deniedAppeals.length,
      },
      avgResolutionTime,
      topCategories,
    };
  }
}
