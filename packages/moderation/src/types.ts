// ============================================================================
// Moderation Package - Type Definitions
// Comprehensive types for content moderation, trust scoring, and appeals
// ============================================================================

/** Content safety categories */
export type ContentCategory =
  | 'safe'
  | 'nsfw'
  | 'violence'
  | 'hate_speech'
  | 'spam'
  | 'harassment'
  | 'self_harm'
  | 'misinformation'
  | 'copyright'
  | 'illegal'
  | 'drugs'
  | 'weapons'
  | 'profanity';

/** Content types that can be moderated */
export type ContentType = 'text' | 'image' | 'video' | 'audio' | 'link' | 'embed';

/** Actions that can be taken on content */
export type ModerationAction =
  | 'approve'
  | 'flag'
  | 'remove'
  | 'restrict'
  | 'ban'
  | 'warn'
  | 'shadow_ban'
  | 'age_restrict'
  | 'mute';

/** Trust levels for users */
export type TrustLevel = 'new' | 'low' | 'medium' | 'high' | 'verified' | 'trusted_creator';

/** Report status lifecycle */
export type ReportStatus = 'open' | 'assigned' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';

/** Appeal status lifecycle */
export type AppealStatus = 'submitted' | 'auto_reviewing' | 'human_review' | 'approved' | 'denied' | 'escalated';

/** Report categories */
export type ReportCategory =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nsfw'
  | 'impersonation'
  | 'copyright'
  | 'misinformation'
  | 'self_harm'
  | 'other';

/** Queue priority levels */
export type QueuePriority = 'critical' | 'high' | 'medium' | 'low';

/** Rule condition operators */
export type RuleOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'matches' | 'in' | 'not_in';

/** Moderation result from classifiers */
export interface ModerationResult {
  id: string;
  contentId: string;
  contentType: ContentType;
  categories: CategoryScore[];
  overallScore: number;
  action: ModerationAction;
  confidence: number;
  automated: boolean;
  reviewedBy?: string;
  reviewedAt?: number;
  flags: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
}

/** Score for a specific content category */
export interface CategoryScore {
  category: ContentCategory;
  score: number;
  confidence: number;
  detected: boolean;
  evidence?: string[];
}

/** Confidence score with reasoning */
export interface ConfidenceScore {
  value: number;
  factors: { name: string; weight: number; score: number }[];
  explanation: string;
}

/** User report */
export interface Report {
  id: string;
  reporterId: string;
  targetContentId: string;
  targetUserId: string;
  category: ReportCategory;
  description: string;
  evidence: string[];
  status: ReportStatus;
  priority: QueuePriority;
  assignedTo?: string;
  resolution?: string;
  actionTaken?: ModerationAction;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

/** Appeal submission */
export interface Appeal {
  id: string;
  userId: string;
  contentId: string;
  originalAction: ModerationAction;
  reason: string;
  evidence: string[];
  status: AppealStatus;
  reviewerId?: string;
  decision?: 'upheld' | 'overturned' | 'modified';
  decisionReason?: string;
  newAction?: ModerationAction;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

/** Automated rule definition */
export interface AutoRule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  action: ModerationAction;
  enabled: boolean;
  priority: number;
  cooldownMs: number;
  maxExecutionsPerHour: number;
  executionCount: number;
  lastExecutedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** Rule condition */
export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
  weight: number;
}

/** Queue item for moderator review */
export interface QueueItem {
  id: string;
  contentId: string;
  contentType: ContentType;
  contentPreview: string;
  priority: QueuePriority;
  category: ContentCategory;
  autoScore: number;
  reportCount: number;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
}

/** Trust score record */
export interface TrustScore {
  userId: string;
  score: number;
  level: TrustLevel;
  factors: TrustFactor[];
  lastCalculated: number;
  history: { score: number; timestamp: number; reason: string }[];
}

/** Trust factor component */
export interface TrustFactor {
  name: string;
  weight: number;
  value: number;
  maxValue: number;
  description: string;
}

/** Moderation config */
export interface ModerationConfig {
  autoRemoveThreshold: number;
  autoFlagThreshold: number;
  requireHumanReview: boolean;
  maxReportsBeforeAction: number;
  appealWindowDays: number;
  trustScoreDecayRate: number;
}

/** Image metadata for moderation */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  hash: string;
  fileSize: number;
  hasExif: boolean;
  hasWatermark: boolean;
}

/** Video moderation timeline entry */
export interface TimelineFlag {
  timestamp: number;
  duration: number;
  category: ContentCategory;
  confidence: number;
  frameIndex: number;
  description: string;
}

/** Action log entry */
export interface ActionLogEntry {
  id: string;
  ruleId: string;
  targetUserId: string;
  targetContentId?: string;
  action: ModerationAction;
  reason: string;
  automated: boolean;
  reversible: boolean;
  reversedAt?: number;
  createdAt: number;
}
