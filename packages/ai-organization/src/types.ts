export interface AutoOrgConfig {
  userId: string;
  enabled: boolean;
  autoTag: boolean;
  autoFolder: boolean;
  prioritySorting: boolean;
  patternLearning: boolean;
  confidenceThreshold: number;
  maxSuggestions: number;
}

export interface OrgRule {
  id: string;
  name: string;
  type: 'tag' | 'folder' | 'priority' | 'archive' | 'custom';
  condition: OrgCondition;
  action: OrgAction;
  priority: number;
  enabled: boolean;
  learned: boolean;
  confidence: number;
  timesApplied: number;
}

export interface OrgCondition {
  field: string;
  operator: 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'type_is' | 'from';
  value: string;
}

export interface OrgAction {
  type: 'move_to_folder' | 'add_tag' | 'set_priority' | 'archive' | 'pin' | 'custom';
  target: string;
  parameters?: Record<string, string>;
}

export interface FileClassification {
  id: string;
  itemId: string;
  itemType: 'file' | 'message' | 'document' | 'email' | 'note' | 'task';
  suggestedTags: TagSuggestion[];
  suggestedFolder: SmartFolder | null;
  priority: Priority;
  confidence: number;
  classifiedAt: Date;
}

export interface SmartFolder {
  id: string;
  name: string;
  path: string;
  description: string;
  rules: OrgRule[];
  itemCount: number;
  createdAt: Date;
  lastUpdated: Date;
  autoCreated: boolean;
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  source: 'content' | 'metadata' | 'pattern' | 'user-history';
  reasoning: string;
}

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface PatternMatch {
  patternId: string;
  description: string;
  matches: number;
  confidence: number;
  lastMatched: Date;
}
