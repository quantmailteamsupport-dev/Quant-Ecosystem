import type {
  AutoOrgConfig,
  OrgRule,
  FileClassification,
  SmartFolder,
  TagSuggestion,
  Priority,
  PatternMatch,
  OrgCondition,
} from './types.js';

export class AutoOrganizer {
  private config: AutoOrgConfig;
  private rules: Map<string, OrgRule>;
  private folders: Map<string, SmartFolder>;
  private patterns: Map<string, PatternMatch>;
  private classifications: FileClassification[];

  constructor(config: Partial<AutoOrgConfig> & { userId: string }) {
    this.config = {
      userId: config.userId,
      enabled: config.enabled ?? true,
      autoTag: config.autoTag ?? true,
      autoFolder: config.autoFolder ?? true,
      prioritySorting: config.prioritySorting ?? true,
      patternLearning: config.patternLearning ?? true,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      maxSuggestions: config.maxSuggestions ?? 5,
    };
    this.rules = new Map();
    this.folders = new Map();
    this.patterns = new Map();
    this.classifications = [];
  }

  getConfig(): AutoOrgConfig {
    return { ...this.config };
  }

  addRule(rule: Omit<OrgRule, 'id' | 'timesApplied'>): OrgRule {
    const fullRule: OrgRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timesApplied: 0,
    };
    this.rules.set(fullRule.id, fullRule);
    return fullRule;
  }

  getRule(ruleId: string): OrgRule | null {
    return this.rules.get(ruleId) ?? null;
  }

  getRules(): OrgRule[] {
    return Array.from(this.rules.values()).sort((a, b) => a.priority - b.priority);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  enableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.enabled = true;
    return true;
  }

  disableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.enabled = false;
    return true;
  }

  createSmartFolder(params: {
    name: string;
    path: string;
    description: string;
    autoCreated?: boolean;
  }): SmartFolder {
    const folder: SmartFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: params.name,
      path: params.path,
      description: params.description,
      rules: [],
      itemCount: 0,
      createdAt: new Date(),
      lastUpdated: new Date(),
      autoCreated: params.autoCreated ?? false,
    };
    this.folders.set(folder.id, folder);
    return folder;
  }

  getSmartFolders(): SmartFolder[] {
    return Array.from(this.folders.values());
  }

  getSmartFolder(folderId: string): SmartFolder | null {
    return this.folders.get(folderId) ?? null;
  }

  removeSmartFolder(folderId: string): boolean {
    return this.folders.delete(folderId);
  }

  classify(item: {
    id: string;
    type: FileClassification['itemType'];
    content: string;
    metadata?: Record<string, string>;
  }): FileClassification {
    const tags = this.suggestTags(item.content, item.metadata);
    const folder = this.suggestFolder(item.content);
    const priority = this.suggestPriority(item.content);

    const classification: FileClassification = {
      id: `cls-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      itemId: item.id,
      itemType: item.type,
      suggestedTags: tags.slice(0, this.config.maxSuggestions),
      suggestedFolder: folder,
      priority,
      confidence: tags.length > 0 ? tags[0]!.confidence : 0.5,
      classifiedAt: new Date(),
    };

    this.classifications.push(classification);
    this.updatePatterns(item.content);

    return classification;
  }

  suggestTags(content: string, metadata?: Record<string, string>): TagSuggestion[] {
    const tags: TagSuggestion[] = [];
    const words = content.toLowerCase().split(/\s+/);

    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.action.type !== 'add_tag') continue;
      if (this.matchesCondition(rule.condition, content, metadata)) {
        tags.push({
          tag: rule.action.target,
          confidence: rule.confidence,
          source: rule.learned ? 'pattern' : 'content',
          reasoning: `Matched rule: ${rule.name}`,
        });
      }
    }

    if (words.includes('urgent') || words.includes('asap')) {
      tags.push({
        tag: 'urgent',
        confidence: 0.9,
        source: 'content',
        reasoning: 'Contains urgency keywords',
      });
    }

    if (words.includes('meeting') || words.includes('calendar')) {
      tags.push({
        tag: 'meeting',
        confidence: 0.85,
        source: 'content',
        reasoning: 'Contains meeting-related keywords',
      });
    }

    if (words.includes('invoice') || words.includes('payment')) {
      tags.push({
        tag: 'finance',
        confidence: 0.85,
        source: 'content',
        reasoning: 'Contains financial keywords',
      });
    }

    return tags.sort((a, b) => b.confidence - a.confidence);
  }

  suggestFolder(content: string): SmartFolder | null {
    if (!this.config.autoFolder) return null;

    for (const folder of this.folders.values()) {
      for (const rule of folder.rules) {
        if (rule.enabled && this.matchesCondition(rule.condition, content)) {
          return folder;
        }
      }
    }
    return null;
  }

  suggestPriority(content: string): Priority {
    if (!this.config.prioritySorting) return 'none';
    const lower = content.toLowerCase();

    if (lower.includes('critical') || lower.includes('emergency')) return 'critical';
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('important'))
      return 'high';
    if (lower.includes('when possible') || lower.includes('low priority')) return 'low';
    return 'medium';
  }

  learnFromAction(itemContent: string, appliedTag: string): OrgRule {
    const rule = this.addRule({
      name: `Learned: tag "${appliedTag}"`,
      type: 'tag',
      condition: {
        field: 'content',
        operator: 'contains',
        value: itemContent.split(/\s+/).slice(0, 3).join(' '),
      },
      action: { type: 'add_tag', target: appliedTag },
      priority: 10,
      enabled: true,
      learned: true,
      confidence: 0.6,
    });

    const pattern: PatternMatch = {
      patternId: rule.id,
      description: `Auto-tag "${appliedTag}" from user action`,
      matches: 1,
      confidence: 0.6,
      lastMatched: new Date(),
    };
    this.patterns.set(rule.id, pattern);

    return rule;
  }

  getPatterns(): PatternMatch[] {
    return Array.from(this.patterns.values());
  }

  getClassifications(): FileClassification[] {
    return [...this.classifications];
  }

  private matchesCondition(
    condition: OrgCondition,
    content: string,
    metadata?: Record<string, string>,
  ): boolean {
    const target = condition.field === 'content' ? content : (metadata?.[condition.field] ?? '');
    const lower = target.toLowerCase();
    const value = condition.value.toLowerCase();

    switch (condition.operator) {
      case 'contains':
        return lower.includes(value);
      case 'startsWith':
        return lower.startsWith(value);
      case 'endsWith':
        return lower.endsWith(value);
      case 'matches':
        return lower === value;
      case 'type_is':
        return lower === value;
      case 'from':
        return lower.includes(value);
      default:
        return false;
    }
  }

  private updatePatterns(content: string): void {
    for (const [patternId, pattern] of this.patterns) {
      const rule = this.rules.get(patternId);
      if (rule && this.matchesCondition(rule.condition, content)) {
        pattern.matches++;
        pattern.lastMatched = new Date();
        if (pattern.matches > 5) {
          pattern.confidence = Math.min(0.95, pattern.confidence + 0.05);
          rule.confidence = pattern.confidence;
        }
      }
    }
  }
}

export function createAutoOrganizer(
  config: Partial<AutoOrgConfig> & { userId: string },
): AutoOrganizer {
  return new AutoOrganizer(config);
}
