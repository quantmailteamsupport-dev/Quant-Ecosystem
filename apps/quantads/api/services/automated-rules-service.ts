// ============================================================================
// QuantAds - Automated Rules Service
// Campaign automation rules, CPA/ROAS triggers, budget adjustments
// ============================================================================

interface AutomatedRule {
  id: string;
  campaignId: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  frequency: 'hourly' | 'daily' | 'weekly';
  isActive: boolean;
  lastEvaluated: Date | null;
  lastTriggered: Date | null;
  triggerCount: number;
  cooldownMinutes: number;
  createdAt: Date;
}

interface RuleCondition {
  metric: 'cpa' | 'roas' | 'ctr' | 'spend' | 'impressions' | 'conversions' | 'cpc' | 'frequency';
  operator: 'greater_than' | 'less_than' | 'equals' | 'between';
  value: number;
  valueMax?: number;
  timeWindow: 'last_hour' | 'last_day' | 'last_7d' | 'last_30d' | 'lifetime';
}

type RuleAction =
  | { type: 'pause_campaign' }
  | { type: 'resume_campaign' }
  | { type: 'increase_budget'; percentage: number }
  | { type: 'decrease_budget'; percentage: number }
  | { type: 'increase_bid'; percentage: number }
  | { type: 'decrease_bid'; percentage: number }
  | { type: 'send_notification'; message: string }
  | { type: 'adjust_targeting'; changes: Record<string, any> };

interface ActionLog {
  id: string;
  ruleId: string;
  campaignId: string;
  action: RuleAction;
  conditionSnapshot: { metric: string; actualValue: number; threshold: number };
  executedAt: Date;
  result: 'success' | 'failed' | 'skipped';
  details: string;
}

interface CampaignMetrics {
  campaignId: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
  frequency: number;
}

export class AutomatedRules {
  private rules: Map<string, AutomatedRule> = new Map();
  private campaignRuleIndex: Map<string, string[]> = new Map();
  private actionLogs: Map<string, ActionLog[]> = new Map();
  private campaignMetrics: Map<string, CampaignMetrics> = new Map();

  async createRule(campaignId: string, config: {
    name: string;
    condition: RuleCondition;
    action: RuleAction;
    frequency?: 'hourly' | 'daily' | 'weekly';
    cooldownMinutes?: number;
  }): Promise<AutomatedRule> {
    if (!config.name || config.name.trim().length === 0) throw new Error('Rule name is required');
    if (!config.condition) throw new Error('Condition is required');
    if (!config.action) throw new Error('Action is required');

    this.validateCondition(config.condition);
    this.validateAction(config.action);

    const ruleId = `arule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const rule: AutomatedRule = {
      id: ruleId,
      campaignId,
      name: config.name.trim(),
      condition: config.condition,
      action: config.action,
      frequency: config.frequency || 'daily',
      isActive: true,
      lastEvaluated: null,
      lastTriggered: null,
      triggerCount: 0,
      cooldownMinutes: config.cooldownMinutes || 60,
      createdAt: new Date(),
    };

    this.rules.set(ruleId, rule);
    const campaignRules = this.campaignRuleIndex.get(campaignId) || [];
    campaignRules.push(ruleId);
    this.campaignRuleIndex.set(campaignId, campaignRules);

    return rule;
  }

  async evaluateRules(campaignId: string, metrics?: CampaignMetrics): Promise<ActionLog[]> {
    const ruleIds = this.campaignRuleIndex.get(campaignId) || [];
    const activeRules = ruleIds
      .map(id => this.rules.get(id))
      .filter((r): r is AutomatedRule => r !== undefined && r.isActive);

    const currentMetrics = metrics || this.campaignMetrics.get(campaignId) || this.generateMockMetrics(campaignId);
    if (!this.campaignMetrics.has(campaignId)) {
      this.campaignMetrics.set(campaignId, currentMetrics);
    }

    const executedActions: ActionLog[] = [];

    for (const rule of activeRules) {
      // Check cooldown
      if (rule.lastTriggered) {
        const elapsed = (Date.now() - rule.lastTriggered.getTime()) / 60000;
        if (elapsed < rule.cooldownMinutes) continue;
      }

      const { triggered, actualValue } = this.evaluateCondition(rule.condition, currentMetrics);
      rule.lastEvaluated = new Date();

      if (triggered) {
        const log = await this.executeAction(rule, currentMetrics, actualValue);
        executedActions.push(log);
        rule.lastTriggered = new Date();
        rule.triggerCount++;
      }
    }

    return executedActions;
  }

  async pauseIfCPA(campaignId: string, threshold: number): Promise<AutomatedRule> {
    return this.createRule(campaignId, {
      name: `Pause if CPA > $${threshold}`,
      condition: { metric: 'cpa', operator: 'greater_than', value: threshold, timeWindow: 'last_day' },
      action: { type: 'pause_campaign' },
      frequency: 'hourly',
    });
  }

  async increaseBudgetIfROAS(campaignId: string, threshold: number, increasePercent: number = 20): Promise<AutomatedRule> {
    return this.createRule(campaignId, {
      name: `Increase budget ${increasePercent}% if ROAS > ${threshold}x`,
      condition: { metric: 'roas', operator: 'greater_than', value: threshold, timeWindow: 'last_7d' },
      action: { type: 'increase_budget', percentage: increasePercent },
      frequency: 'daily',
    });
  }

  async decreaseBidIfCTRLow(campaignId: string, ctrThreshold: number, decreasePercent: number = 10): Promise<AutomatedRule> {
    return this.createRule(campaignId, {
      name: `Decrease bid ${decreasePercent}% if CTR < ${ctrThreshold}%`,
      condition: { metric: 'ctr', operator: 'less_than', value: ctrThreshold / 100, timeWindow: 'last_day' },
      action: { type: 'decrease_bid', percentage: decreasePercent },
      frequency: 'daily',
    });
  }

  async getActionLog(campaignId: string, options?: { limit?: number; ruleId?: string }): Promise<ActionLog[]> {
    let logs = this.actionLogs.get(campaignId) || [];
    if (options?.ruleId) {
      logs = logs.filter(l => l.ruleId === options.ruleId);
    }
    return logs
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, options?.limit || 50);
  }

  async pauseRule(ruleId: string): Promise<AutomatedRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error('Rule not found');
    rule.isActive = false;
    return rule;
  }

  async resumeRule(ruleId: string): Promise<AutomatedRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error('Rule not found');
    rule.isActive = true;
    return rule;
  }

  async getActiveRules(campaignId: string): Promise<AutomatedRule[]> {
    const ruleIds = this.campaignRuleIndex.get(campaignId) || [];
    return ruleIds
      .map(id => this.rules.get(id))
      .filter((r): r is AutomatedRule => r !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error('Rule not found');

    this.rules.delete(ruleId);
    const campaignRules = this.campaignRuleIndex.get(rule.campaignId) || [];
    this.campaignRuleIndex.set(rule.campaignId, campaignRules.filter(id => id !== ruleId));
  }

  async updateMetrics(campaignId: string, metrics: Partial<CampaignMetrics>): Promise<void> {
    const current = this.campaignMetrics.get(campaignId) || this.generateMockMetrics(campaignId);
    Object.assign(current, metrics);
    this.campaignMetrics.set(campaignId, current);
  }

  private evaluateCondition(condition: RuleCondition, metrics: CampaignMetrics): { triggered: boolean; actualValue: number } {
    let actualValue: number;

    switch (condition.metric) {
      case 'cpa': actualValue = metrics.cpa; break;
      case 'roas': actualValue = metrics.roas; break;
      case 'ctr': actualValue = metrics.ctr; break;
      case 'spend': actualValue = metrics.spend; break;
      case 'impressions': actualValue = metrics.impressions; break;
      case 'conversions': actualValue = metrics.conversions; break;
      case 'cpc': actualValue = metrics.cpc; break;
      case 'frequency': actualValue = metrics.frequency; break;
      default: actualValue = 0;
    }

    let triggered: boolean;
    switch (condition.operator) {
      case 'greater_than': triggered = actualValue > condition.value; break;
      case 'less_than': triggered = actualValue < condition.value; break;
      case 'equals': triggered = Math.abs(actualValue - condition.value) < 0.01; break;
      case 'between': triggered = actualValue >= condition.value && actualValue <= (condition.valueMax || Infinity); break;
      default: triggered = false;
    }

    return { triggered, actualValue };
  }

  private async executeAction(rule: AutomatedRule, metrics: CampaignMetrics, actualValue: number): Promise<ActionLog> {
    const logId = `alog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let details: string;

    switch (rule.action.type) {
      case 'pause_campaign': details = `Campaign ${rule.campaignId} paused`; break;
      case 'resume_campaign': details = `Campaign ${rule.campaignId} resumed`; break;
      case 'increase_budget': details = `Budget increased by ${rule.action.percentage}%`; break;
      case 'decrease_budget': details = `Budget decreased by ${rule.action.percentage}%`; break;
      case 'increase_bid': details = `Bid increased by ${rule.action.percentage}%`; break;
      case 'decrease_bid': details = `Bid decreased by ${rule.action.percentage}%`; break;
      case 'send_notification': details = `Notification sent: ${rule.action.message}`; break;
      case 'adjust_targeting': details = `Targeting adjusted`; break;
      default: details = 'Action executed';
    }

    const log: ActionLog = {
      id: logId,
      ruleId: rule.id,
      campaignId: rule.campaignId,
      action: rule.action,
      conditionSnapshot: { metric: rule.condition.metric, actualValue, threshold: rule.condition.value },
      executedAt: new Date(),
      result: 'success',
      details,
    };

    const logs = this.actionLogs.get(rule.campaignId) || [];
    logs.push(log);
    this.actionLogs.set(rule.campaignId, logs);

    return log;
  }

  private validateCondition(condition: RuleCondition): void {
    const validMetrics = ['cpa', 'roas', 'ctr', 'spend', 'impressions', 'conversions', 'cpc', 'frequency'];
    if (!validMetrics.includes(condition.metric)) throw new Error(`Invalid metric: ${condition.metric}`);
    if (condition.value < 0) throw new Error('Condition value must be non-negative');
  }

  private validateAction(action: RuleAction): void {
    if ('percentage' in action && (action.percentage <= 0 || action.percentage > 100)) {
      throw new Error('Percentage must be between 1 and 100');
    }
  }

  private generateMockMetrics(campaignId: string): CampaignMetrics {
    const impressions = Math.floor(Math.random() * 100000) + 1000;
    const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.04));
    const conversions = Math.floor(clicks * (0.02 + Math.random() * 0.08));
    const spend = clicks * (0.5 + Math.random() * 2);
    const revenue = conversions * (20 + Math.random() * 80);

    return {
      campaignId,
      spend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      conversions,
      revenue: Math.round(revenue * 100) / 100,
      cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 10000 : 0,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      frequency: 1.5 + Math.random() * 2,
    };
  }
}

export const automatedRules = new AutomatedRules();
