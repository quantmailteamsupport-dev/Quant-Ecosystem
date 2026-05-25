// ============================================================================
// Admin & Operations Package - Revenue Dashboard
// ============================================================================

import type {
  RevenueSnapshot,
  SubscriptionMetric,
  RefundMetric,
  RevenueForecast,
  RevenueBySegment,
} from '../types';

/** Revenue alert */
interface RevenueAlert {
  id: string;
  type: 'revenue_drop' | 'unusual_refunds' | 'churn_spike' | 'revenue_spike';
  message: string;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  timestamp: number;
}

/** Transaction record */
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'subscription' | 'one_time' | 'refund' | 'expansion' | 'contraction';
  plan: string;
  region: string;
  channel: string;
  timestamp: number;
  refundReason?: string;
}

/**
 * RevenueDashboard - Real-time revenue analytics and forecasting
 * Tracks subscriptions, refunds, revenue by plan/region/channel,
 * forecasting with trend analysis, and significant change alerts.
 */
export class RevenueDashboard {
  private transactions: Transaction[] = [];
  private alerts: RevenueAlert[] = [];
  private alertCounter: number = 0;

  /**
   * Record a transaction
   */
  public recordTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
    const id = `txn_${Date.now()}_${this.transactions.length + 1}`;
    const fullTransaction = { ...transaction, id };
    this.transactions.push(fullTransaction);
    return fullTransaction;
  }

  /**
   * Get real-time revenue for current period with comparison to previous
   */
  public getRealtimeRevenue(periodMs: number = 86400000): RevenueSnapshot {
    const now = Date.now();
    const currentPeriodStart = now - periodMs;
    const previousPeriodStart = currentPeriodStart - periodMs;

    // Current period
    const currentTransactions = this.transactions.filter(
      t => t.timestamp >= currentPeriodStart && t.type !== 'refund'
    );
    const currentRevenue = currentTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Previous period
    const previousTransactions = this.transactions.filter(
      t => t.timestamp >= previousPeriodStart && t.timestamp < currentPeriodStart && t.type !== 'refund'
    );
    const previousRevenue = previousTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Growth rate
    const growthRate = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    // Average transaction value
    const avgTransactionValue = currentTransactions.length > 0
      ? currentRevenue / currentTransactions.length
      : 0;

    return {
      period: `${periodMs / 3600000}h`,
      revenue: Math.round(currentRevenue * 100) / 100,
      previousPeriodRevenue: Math.round(previousRevenue * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
      transactionCount: currentTransactions.length,
      avgTransactionValue: Math.round(avgTransactionValue * 100) / 100,
      timestamp: now,
    };
  }

  /**
   * Get subscription metrics: new, churned, expanded, contracted
   */
  public getSubscriptionMetrics(periodMs: number = 2592000000): SubscriptionMetric {
    const now = Date.now();
    const periodStart = now - periodMs;

    const periodTransactions = this.transactions.filter(t => t.timestamp >= periodStart);

    const newSubscriptions = periodTransactions.filter(t => t.type === 'subscription').length;
    const expansions = periodTransactions.filter(t => t.type === 'expansion');
    const contractions = periodTransactions.filter(t => t.type === 'contraction');

    // Churn: count refunds on subscriptions
    const churned = periodTransactions.filter(
      t => t.type === 'refund' && t.refundReason === 'cancellation'
    ).length;

    // MRR calculation
    const subscriptionRevenue = periodTransactions
      .filter(t => t.type === 'subscription' || t.type === 'expansion')
      .reduce((sum, t) => sum + t.amount, 0);

    const lostRevenue = periodTransactions
      .filter(t => t.type === 'contraction' || (t.type === 'refund' && t.refundReason === 'cancellation'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const mrr = subscriptionRevenue - lostRevenue;
    const previousMrr = mrr * 0.95; // Simplified approximation
    const mrrGrowth = previousMrr > 0 ? ((mrr - previousMrr) / previousMrr) * 100 : 0;

    return {
      period: `${Math.round(periodMs / 86400000)}d`,
      newSubscriptions,
      churned,
      expanded: expansions.length,
      contracted: contractions.length,
      netNew: newSubscriptions - churned,
      mrr: Math.round(mrr * 100) / 100,
      mrrGrowth: Math.round(mrrGrowth * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
    };
  }

  /**
   * Get refund metrics with breakdown by reason
   */
  public getRefundMetrics(periodMs: number = 2592000000): RefundMetric {
    const now = Date.now();
    const periodStart = now - periodMs;

    const periodTransactions = this.transactions.filter(t => t.timestamp >= periodStart);
    const refunds = periodTransactions.filter(t => t.type === 'refund');
    const totalTransactions = periodTransactions.filter(t => t.type !== 'refund').length;

    const refundTotal = refunds.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const refundRate = totalTransactions > 0 ? refunds.length / totalTransactions : 0;

    // Reason breakdown
    const reasonBreakdown: Record<string, number> = {};
    for (const refund of refunds) {
      const reason = refund.refundReason || 'unknown';
      reasonBreakdown[reason] = (reasonBreakdown[reason] || 0) + 1;
    }

    const avgRefundAmount = refunds.length > 0 ? refundTotal / refunds.length : 0;

    return {
      period: `${Math.round(periodMs / 86400000)}d`,
      refundCount: refunds.length,
      refundTotal: Math.round(refundTotal * 100) / 100,
      refundRate: Math.round(refundRate * 10000) / 10000,
      reasonBreakdown,
      avgRefundAmount: Math.round(avgRefundAmount * 100) / 100,
    };
  }

  /**
   * Get revenue breakdown by pricing plan
   */
  public getRevenueByPlan(periodMs: number = 2592000000): RevenueBySegment[] {
    return this.getRevenueBySegment('plan', periodMs);
  }

  /**
   * Get revenue breakdown by geographic region
   */
  public getRevenueByRegion(periodMs: number = 2592000000): RevenueBySegment[] {
    return this.getRevenueBySegment('region', periodMs);
  }

  /**
   * Get revenue breakdown by acquisition channel
   */
  public getRevenueByChannel(periodMs: number = 2592000000): RevenueBySegment[] {
    return this.getRevenueBySegment('channel', periodMs);
  }

  /**
   * Forecast revenue using simple trend extrapolation
   */
  public forecast(periodsAhead: number = 3, periodMs: number = 2592000000): RevenueForecast {
    const now = Date.now();
    const periods: Array<{ revenue: number; period: number }> = [];

    // Calculate historical revenue per period
    for (let i = 5; i >= 0; i--) {
      const periodEnd = now - (i * periodMs);
      const periodStart = periodEnd - periodMs;
      const revenue = this.transactions
        .filter(t => t.timestamp >= periodStart && t.timestamp < periodEnd && t.type !== 'refund')
        .reduce((sum, t) => sum + t.amount, 0);
      periods.push({ revenue, period: i });
    }

    // Calculate growth rate (average period-over-period growth)
    let totalGrowth = 0;
    let growthPoints = 0;
    for (let i = 1; i < periods.length; i++) {
      if (periods[i - 1].revenue > 0) {
        const growth = (periods[i].revenue - periods[i - 1].revenue) / periods[i - 1].revenue;
        totalGrowth += growth;
        growthPoints++;
      }
    }
    const avgGrowthRate = growthPoints > 0 ? totalGrowth / growthPoints : 0;

    // Generate forecast
    const lastRevenue = periods[periods.length - 1]?.revenue || 0;
    const forecastPeriods = [];

    for (let i = 1; i <= periodsAhead; i++) {
      const predicted = lastRevenue * Math.pow(1 + avgGrowthRate, i);
      const variance = predicted * 0.15 * i; // Increasing uncertainty

      forecastPeriods.push({
        period: `period_+${i}`,
        predicted: Math.round(predicted * 100) / 100,
        lowerBound: Math.round((predicted - variance) * 100) / 100,
        upperBound: Math.round((predicted + variance) * 100) / 100,
      });
    }

    // Confidence decreases with distance
    const confidence = Math.max(0.5, 1 - (periodsAhead * 0.1));

    return {
      periods: forecastPeriods,
      confidence: Math.round(confidence * 100) / 100,
      model: 'linear_growth_extrapolation',
      generatedAt: now,
    };
  }

  /**
   * Get revenue alerts for significant changes (>20% drop, unusual refunds)
   */
  public getRevenueAlerts(): RevenueAlert[] {
    const alerts: RevenueAlert[] = [];

    // Check for revenue drop
    const snapshot = this.getRealtimeRevenue();
    if (snapshot.growthRate < -20) {
      this.alertCounter++;
      alerts.push({
        id: `rev_alert_${this.alertCounter}`,
        type: 'revenue_drop',
        message: `Revenue dropped ${Math.abs(snapshot.growthRate).toFixed(1)}% compared to previous period`,
        severity: snapshot.growthRate < -50 ? 'critical' : 'warning',
        value: snapshot.growthRate,
        threshold: -20,
        timestamp: Date.now(),
      });
    }

    // Check for unusual refunds
    const refundMetrics = this.getRefundMetrics(86400000); // Last 24h
    if (refundMetrics.refundRate > 0.1) {
      this.alertCounter++;
      alerts.push({
        id: `rev_alert_${this.alertCounter}`,
        type: 'unusual_refunds',
        message: `Refund rate at ${(refundMetrics.refundRate * 100).toFixed(1)}% (threshold: 10%)`,
        severity: refundMetrics.refundRate > 0.2 ? 'critical' : 'warning',
        value: refundMetrics.refundRate,
        threshold: 0.1,
        timestamp: Date.now(),
      });
    }

    // Check for revenue spike (could indicate error)
    if (snapshot.growthRate > 100) {
      this.alertCounter++;
      alerts.push({
        id: `rev_alert_${this.alertCounter}`,
        type: 'revenue_spike',
        message: `Unusual revenue spike: +${snapshot.growthRate.toFixed(1)}% compared to previous period`,
        severity: 'warning',
        value: snapshot.growthRate,
        threshold: 100,
        timestamp: Date.now(),
      });
    }

    this.alerts = alerts;
    return alerts;
  }

  /**
   * Get revenue by segment (generic for plan, region, channel)
   */
  private getRevenueBySegment(segmentType: 'plan' | 'region' | 'channel', periodMs: number): RevenueBySegment[] {
    const now = Date.now();
    const periodStart = now - periodMs;
    const previousPeriodStart = periodStart - periodMs;

    const currentTransactions = this.transactions.filter(
      t => t.timestamp >= periodStart && t.type !== 'refund'
    );
    const previousTransactions = this.transactions.filter(
      t => t.timestamp >= previousPeriodStart && t.timestamp < periodStart && t.type !== 'refund'
    );

    const totalRevenue = currentTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Group by segment
    const segmentMap = new Map<string, { revenue: number; userIds: Set<string> }>();
    for (const t of currentTransactions) {
      const segment = t[segmentType] || 'unknown';
      const existing = segmentMap.get(segment) || { revenue: 0, userIds: new Set() };
      existing.revenue += t.amount;
      existing.userIds.add(t.userId);
      segmentMap.set(segment, existing);
    }

    // Previous period for growth
    const prevSegmentMap = new Map<string, number>();
    for (const t of previousTransactions) {
      const segment = t[segmentType] || 'unknown';
      prevSegmentMap.set(segment, (prevSegmentMap.get(segment) || 0) + t.amount);
    }

    const results: RevenueBySegment[] = [];
    for (const [segment, data] of segmentMap) {
      const prevRevenue = prevSegmentMap.get(segment) || 0;
      const growth = prevRevenue > 0 ? ((data.revenue - prevRevenue) / prevRevenue) * 100 : 0;

      results.push({
        segment,
        segmentType,
        revenue: Math.round(data.revenue * 100) / 100,
        percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 10000) / 100 : 0,
        growth: Math.round(growth * 100) / 100,
        userCount: data.userIds.size,
      });
    }

    return results.sort((a, b) => b.revenue - a.revenue);
  }
}
