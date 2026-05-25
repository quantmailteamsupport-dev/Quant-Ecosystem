// ============================================================================
// QuantMail - Rules Engine Service
// Email rule creation, evaluation, condition matching with AND/OR/regex logic
// ============================================================================

interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'size' | 'hasAttachment' | 'cc';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'greaterThan' | 'lessThan';
  value: string;
  negate?: boolean;
}

interface RuleConditionGroup {
  logic: 'AND' | 'OR';
  conditions: (RuleCondition | RuleConditionGroup)[];
}

type RuleAction =
  | { type: 'label'; label: string }
  | { type: 'forward'; to: string }
  | { type: 'archive' }
  | { type: 'delete' }
  | { type: 'markRead' }
  | { type: 'markImportant' }
  | { type: 'moveToFolder'; folder: string }
  | { type: 'autoReply'; message: string };

interface EmailRule {
  id: string;
  userId: string;
  name: string;
  description: string;
  conditionGroup: RuleConditionGroup;
  actions: RuleAction[];
  priority: number;
  isActive: boolean;
  stopProcessing: boolean;
  matchCount: number;
  lastMatchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  size: number;
  hasAttachment: boolean;
  headers: Record<string, string>;
}

interface RuleMatch {
  ruleId: string;
  ruleName: string;
  actions: RuleAction[];
  priority: number;
}

export class RulesEngine {
  private rules: Map<string, EmailRule> = new Map();
  private userRuleIndex: Map<string, string[]> = new Map();

  async createRule(userId: string, config: {
    name: string;
    description?: string;
    conditionGroup: RuleConditionGroup;
    actions: RuleAction[];
    priority?: number;
    stopProcessing?: boolean;
  }): Promise<EmailRule> {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Rule name is required');
    }
    if (!config.conditionGroup || !config.conditionGroup.conditions.length) {
      throw new Error('At least one condition is required');
    }
    if (!config.actions || config.actions.length === 0) {
      throw new Error('At least one action is required');
    }

    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const userRules = this.userRuleIndex.get(userId) || [];
    const maxPriority = userRules.reduce((max, id) => {
      const r = this.rules.get(id);
      return r ? Math.max(max, r.priority) : max;
    }, 0);

    const rule: EmailRule = {
      id: ruleId,
      userId,
      name: config.name.trim(),
      description: config.description || '',
      conditionGroup: config.conditionGroup,
      actions: config.actions,
      priority: config.priority ?? maxPriority + 1,
      isActive: true,
      stopProcessing: config.stopProcessing ?? false,
      matchCount: 0,
      lastMatchedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(ruleId, rule);
    userRules.push(ruleId);
    this.userRuleIndex.set(userId, userRules);
    return rule;
  }

  async evaluateRules(userId: string, email: EmailMessage): Promise<RuleMatch[]> {
    const userRuleIds = this.userRuleIndex.get(userId) || [];
    const activeRules = userRuleIds
      .map(id => this.rules.get(id))
      .filter((r): r is EmailRule => r !== undefined && r.isActive)
      .sort((a, b) => a.priority - b.priority);

    const matches: RuleMatch[] = [];

    for (const rule of activeRules) {
      const isMatch = this.evaluateConditionGroup(rule.conditionGroup, email);
      if (isMatch) {
        rule.matchCount++;
        rule.lastMatchedAt = new Date();
        matches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actions: rule.actions,
          priority: rule.priority,
        });
        if (rule.stopProcessing) break;
      }
    }

    return matches;
  }

  private evaluateConditionGroup(group: RuleConditionGroup, email: EmailMessage): boolean {
    const results = group.conditions.map(condition => {
      if ('logic' in condition) {
        return this.evaluateConditionGroup(condition as RuleConditionGroup, email);
      }
      return this.evaluateCondition(condition as RuleCondition, email);
    });

    if (group.logic === 'AND') {
      return results.every(r => r);
    }
    return results.some(r => r);
  }

  private evaluateCondition(condition: RuleCondition, email: EmailMessage): boolean {
    let fieldValue: string;

    switch (condition.field) {
      case 'from': fieldValue = email.from; break;
      case 'to': fieldValue = email.to.join(', '); break;
      case 'cc': fieldValue = (email.cc || []).join(', '); break;
      case 'subject': fieldValue = email.subject; break;
      case 'body': fieldValue = email.body; break;
      case 'size': fieldValue = email.size.toString(); break;
      case 'hasAttachment': fieldValue = email.hasAttachment.toString(); break;
      default: fieldValue = '';
    }

    let result: boolean;

    switch (condition.operator) {
      case 'contains':
        result = fieldValue.toLowerCase().includes(condition.value.toLowerCase());
        break;
      case 'equals':
        result = fieldValue.toLowerCase() === condition.value.toLowerCase();
        break;
      case 'startsWith':
        result = fieldValue.toLowerCase().startsWith(condition.value.toLowerCase());
        break;
      case 'endsWith':
        result = fieldValue.toLowerCase().endsWith(condition.value.toLowerCase());
        break;
      case 'regex':
        try {
          const regex = new RegExp(condition.value, 'i');
          result = regex.test(fieldValue);
        } catch {
          result = false;
        }
        break;
      case 'greaterThan':
        result = parseFloat(fieldValue) > parseFloat(condition.value);
        break;
      case 'lessThan':
        result = parseFloat(fieldValue) < parseFloat(condition.value);
        break;
      default:
        result = false;
    }

    return condition.negate ? !result : result;
  }

  async updateRule(ruleId: string, userId: string, updates: Partial<Pick<EmailRule, 'name' | 'description' | 'conditionGroup' | 'actions' | 'stopProcessing'>>): Promise<EmailRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error('Rule not found');
    if (rule.userId !== userId) throw new Error('Access denied');

    if (updates.name !== undefined) rule.name = updates.name;
    if (updates.description !== undefined) rule.description = updates.description;
    if (updates.conditionGroup !== undefined) rule.conditionGroup = updates.conditionGroup;
    if (updates.actions !== undefined) rule.actions = updates.actions;
    if (updates.stopProcessing !== undefined) rule.stopProcessing = updates.stopProcessing;
    rule.updatedAt = new Date();

    return rule;
  }

  async deleteRule(ruleId: string, userId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error('Rule not found');
    if (rule.userId !== userId) throw new Error('Access denied');

    this.rules.delete(ruleId);
    const userRules = this.userRuleIndex.get(userId) || [];
    this.userRuleIndex.set(userId, userRules.filter(id => id !== ruleId));
  }

  async getRules(userId: string): Promise<EmailRule[]> {
    const userRuleIds = this.userRuleIndex.get(userId) || [];
    return userRuleIds
      .map(id => this.rules.get(id))
      .filter((r): r is EmailRule => r !== undefined)
      .sort((a, b) => a.priority - b.priority);
  }

  async setRulePriority(ruleId: string, userId: string, newPriority: number): Promise<EmailRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error('Rule not found');
    if (rule.userId !== userId) throw new Error('Access denied');

    const oldPriority = rule.priority;
    const userRuleIds = this.userRuleIndex.get(userId) || [];

    for (const id of userRuleIds) {
      const r = this.rules.get(id);
      if (!r || r.id === ruleId) continue;
      if (newPriority < oldPriority && r.priority >= newPriority && r.priority < oldPriority) {
        r.priority++;
      } else if (newPriority > oldPriority && r.priority <= newPriority && r.priority > oldPriority) {
        r.priority--;
      }
    }

    rule.priority = newPriority;
    rule.updatedAt = new Date();
    return rule;
  }

  async toggleRule(ruleId: string, userId: string): Promise<EmailRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) throw new Error('Rule not found');
    if (rule.userId !== userId) throw new Error('Access denied');

    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date();
    return rule;
  }

  async getRuleStats(userId: string): Promise<{ totalRules: number; activeRules: number; totalMatches: number; topRule: string | null }> {
    const rules = await this.getRules(userId);
    const activeRules = rules.filter(r => r.isActive);
    const totalMatches = rules.reduce((sum, r) => sum + r.matchCount, 0);
    const topRule = rules.sort((a, b) => b.matchCount - a.matchCount)[0]?.name || null;

    return { totalRules: rules.length, activeRules: activeRules.length, totalMatches, topRule };
  }
}

export const rulesEngine = new RulesEngine();
