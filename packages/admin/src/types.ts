// ============================================================================
// Admin & Operations Package - Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Admin User & RBAC Types
// ---------------------------------------------------------------------------

/** Admin user account */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermission[];
  lastLogin: number;
  mfaEnabled: boolean;
  active: boolean;
  createdAt: number;
}

/** Admin role levels */
export type AdminRole = 'super_admin' | 'moderator' | 'support' | 'analyst' | 'engineer' | 'billing_admin';

/** Granular permissions */
export type AdminPermission =
  | 'users.read' | 'users.write' | 'users.delete' | 'users.ban' | 'users.impersonate'
  | 'content.read' | 'content.moderate' | 'content.delete'
  | 'system.health' | 'system.deploy' | 'system.config'
  | 'flags.read' | 'flags.write' | 'flags.delete'
  | 'incidents.read' | 'incidents.declare' | 'incidents.resolve'
  | 'revenue.read' | 'revenue.refund'
  | 'audit.read' | 'audit.export'
  | 'tickets.read' | 'tickets.assign' | 'tickets.respond'
  | 'alerts.read' | 'alerts.manage'
  | 'jobs.read' | 'jobs.manage'
  | 'migrations.read' | 'migrations.execute';

/** Role-based access control policy */
export interface RBACPolicy {
  role: AdminRole;
  permissions: AdminPermission[];
  inherits?: AdminRole[];
  restrictions?: PolicyRestriction[];
}

/** Policy restriction */
export interface PolicyRestriction {
  resource: string;
  condition: string;
  value: string;
}

// ---------------------------------------------------------------------------
// User Management Types
// ---------------------------------------------------------------------------

/** Query for searching users */
export interface UserSearchQuery {
  text?: string;
  status?: UserStatus;
  plan?: string;
  country?: string;
  dateFrom?: number;
  dateTo?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/** User status */
export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending' | 'deactivated';

/** User search result */
export interface UserSearchResult {
  users: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Comprehensive user profile */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  plan: string;
  country: string;
  riskScore: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  createdAt: number;
  lastActiveAt: number;
  totalSpent: number;
  ticketCount: number;
  flagCount: number;
  metadata: Record<string, unknown>;
}

/** User action record */
export interface UserAction {
  id: string;
  userId: string;
  type: UserActionType;
  performedBy: string;
  reason: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  expiresAt?: number;
}

/** Types of actions that can be performed on users */
export type UserActionType =
  | 'suspend' | 'unsuspend' | 'ban' | 'unban'
  | 'verify_email' | 'verify_phone' | 'verify_identity'
  | 'edit_profile' | 'reset_password' | 'force_logout'
  | 'impersonate_start' | 'impersonate_end'
  | 'export_data' | 'delete_account';

/** Ban configuration */
export interface BanConfig {
  userId: string;
  reason: string;
  trackIP: boolean;
  removeContent: boolean;
  notifyUser: boolean;
  bannedBy: string;
}

/** Suspension configuration */
export interface SuspensionConfig {
  userId: string;
  reason: string;
  duration: number;
  notifyUser: boolean;
  suspendedBy: string;
}

/** Impersonation session */
export interface ImpersonationSession {
  id: string;
  adminId: string;
  targetUserId: string;
  startedAt: number;
  expiresAt: number;
  restrictedActions: string[];
  auditLog: string[];
}

// ---------------------------------------------------------------------------
// Content Moderation Types
// ---------------------------------------------------------------------------

/** Content item pending moderation */
export interface ContentModerationItem {
  id: string;
  contentType: ContentType;
  contentId: string;
  authorId: string;
  reportCount: number;
  reportReasons: string[];
  priority: ModerationPriority;
  status: ModerationStatus;
  assignedTo?: string;
  contentSnippet: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  lastReportedAt: number;
}

/** Content type being moderated */
export type ContentType = 'post' | 'comment' | 'message' | 'profile' | 'image' | 'video' | 'link';

/** Moderation action taken */
export interface ModerationAction {
  id: string;
  itemId: string;
  action: ModerationActionType;
  reviewerId: string;
  reason: string;
  notifyAuthor: boolean;
  timestamp: number;
}

/** Types of moderation actions */
export type ModerationActionType = 'approve' | 'remove' | 'warn' | 'escalate' | 'restrict' | 'shadow_ban';

/** Priority level for moderation queue */
export type ModerationPriority = 'critical' | 'high' | 'medium' | 'low';

/** Moderation item status */
export type ModerationStatus = 'pending' | 'in_review' | 'actioned' | 'dismissed' | 'appealed';

/** Moderation queue statistics */
export interface ModerationStats {
  queueDepth: number;
  avgReviewTimeMs: number;
  actionBreakdown: Record<ModerationActionType, number>;
  falsePositiveRate: number;
  itemsByPriority: Record<ModerationPriority, number>;
  reviewerStats: ReviewerStats[];
}

/** Stats per reviewer */
export interface ReviewerStats {
  reviewerId: string;
  itemsReviewed: number;
  avgTimeMs: number;
  accuracy: number;
}

/** Appeal request from user */
export interface AppealRequest {
  id: string;
  originalItemId: string;
  userId: string;
  reason: string;
  evidence?: string;
  status: AppealStatus;
  assignedTo?: string;
  createdAt: number;
  resolvedAt?: number;
}

/** Appeal status */
export type AppealStatus = 'pending' | 'under_review' | 'upheld' | 'overturned' | 'dismissed';

/** Reviewer assignment */
export interface ReviewerAssignment {
  reviewerId: string;
  specializations: ContentType[];
  currentLoad: number;
  maxLoad: number;
  available: boolean;
}

// ---------------------------------------------------------------------------
// System Health Types
// ---------------------------------------------------------------------------

/** System health overview */
export interface SystemHealth {
  overall: HealthStatus;
  services: ServiceStatus[];
  lastChecked: number;
  uptimePercentage: number;
  activeIncidents: number;
}

/** Health status enum */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/** Individual service status */
export interface ServiceStatus {
  name: string;
  status: HealthStatus;
  endpoint: string;
  responseTimeMs: number;
  lastChecked: number;
  errorRate: number;
  version: string;
  metadata: Record<string, unknown>;
}

/** Uptime record for a service */
export interface UptimeRecord {
  serviceName: string;
  windowStart: number;
  windowEnd: number;
  totalChecks: number;
  successfulChecks: number;
  uptimePercentage: number;
  downtimeMinutes: number;
}

/** Error rate metric */
export interface ErrorRateMetric {
  serviceName: string;
  window: string;
  totalRequests: number;
  errorCount: number;
  errorRate: number;
  trend: TrendDirection;
  byStatusCode: Record<number, number>;
}

/** Trend direction */
export type TrendDirection = 'up' | 'down' | 'stable';

/** Latency metric */
export interface LatencyMetric {
  serviceName: string;
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  max: number;
  sloTarget: number;
  withinSLO: boolean;
}

/** Health check configuration */
export interface HealthCheck {
  serviceName: string;
  endpoint: string;
  intervalMs: number;
  timeoutMs: number;
  expectedStatus: number;
  retries: number;
}

/** External dependency status */
export interface DependencyStatus {
  name: string;
  type: DependencyType;
  status: HealthStatus;
  latencyMs: number;
  lastError?: string;
  lastChecked: number;
}

/** Dependency type */
export type DependencyType = 'database' | 'cache' | 'queue' | 'external_api' | 'storage' | 'cdn';

// ---------------------------------------------------------------------------
// Feature Flag Types
// ---------------------------------------------------------------------------

/** Feature flag definition */
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  type: FlagType;
  enabled: boolean;
  value: unknown;
  targeting: TargetingRule[];
  rollout?: GradualRollout;
  abConfig?: ABTestConfig;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

/** Flag type determines evaluation strategy */
export type FlagType = 'boolean' | 'percentage' | 'userTarget' | 'abTest';

/** Rollout configuration for percentage flags */
export interface RolloutConfig {
  percentage: number;
  seed: string;
  excludedGroups: string[];
}

/** Targeting rule for user-targeted flags */
export interface TargetingRule {
  attribute: string;
  operator: TargetingOperator;
  value: string | string[] | number;
  negate: boolean;
}

/** Targeting operators */
export type TargetingOperator = 'equals' | 'contains' | 'in' | 'gt' | 'lt' | 'gte' | 'lte' | 'regex' | 'startsWith';

/** A/B test variant */
export interface ABVariant {
  id: string;
  name: string;
  weight: number;
  value: unknown;
}

/** A/B test configuration */
export interface ABTestConfig {
  variants: ABVariant[];
  trafficAllocation: number;
  seed: string;
}

/** Result of evaluating a flag for a user */
export interface FlagEvaluation {
  flagId: string;
  value: unknown;
  variant?: string;
  reason: EvaluationReason;
  timestamp: number;
}

/** Why a flag evaluated to its value */
export type EvaluationReason = 'default' | 'targeting_match' | 'percentage_included' | 'percentage_excluded' | 'ab_variant' | 'kill_switch' | 'disabled';

/** Gradual rollout schedule */
export interface GradualRollout {
  stages: RolloutStage[];
  currentStage: number;
  startedAt: number;
  autoAdvance: boolean;
}

/** A single stage in a gradual rollout */
export interface RolloutStage {
  percentage: number;
  advanceAfterMs: number;
  advancedAt?: number;
}

// ---------------------------------------------------------------------------
// Live Config Types
// ---------------------------------------------------------------------------

/** Live configuration entry */
export interface LiveConfig {
  key: string;
  value: unknown;
  type: ConfigValueType;
  environment: string;
  version: number;
  updatedBy: string;
  updatedAt: number;
  description: string;
  validationRules?: ConfigValidationRule[];
}

/** Config value type */
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'json' | 'secret';

/** Individual config entry */
export interface ConfigEntry {
  key: string;
  value: unknown;
  type: ConfigValueType;
  description: string;
  defaultValue: unknown;
}

/** Versioned config */
export interface ConfigVersion {
  version: number;
  key: string;
  value: unknown;
  changedBy: string;
  changedAt: number;
  reason: string;
}

/** Record of a config change */
export interface ConfigChange {
  id: string;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
  timestamp: number;
  environment: string;
}

/** Config validation rule */
export interface ConfigValidationRule {
  type: 'range' | 'regex' | 'enum' | 'type' | 'dependency';
  params: Record<string, unknown>;
}

/** Environment-specific configuration */
export interface EnvironmentConfig {
  environment: string;
  configs: LiveConfig[];
  lastSynced: number;
}

/** Secret configuration (encrypted) */
export interface SecretConfig {
  key: string;
  encryptedValue: string;
  algorithm: string;
  rotatedAt: number;
  expiresAt?: number;
}

// ---------------------------------------------------------------------------
// Incident Management Types
// ---------------------------------------------------------------------------

/** Incident record */
export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  declaredBy: string;
  declaredAt: number;
  resolvedAt?: number;
  duration?: number;
  updates: StatusUpdate[];
  responders: Responder[];
  affectedServices: string[];
  impactDescription: string;
  customerImpact: number;
}

/** Incident severity levels */
export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

/** Incident lifecycle status */
export type IncidentStatus = 'declared' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'post_mortem';

/** Timeline update */
export interface StatusUpdate {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  message: string;
  author: string;
  timestamp: number;
  actionsTaken: string[];
}

/** Incident responder */
export interface Responder {
  id: string;
  name: string;
  role: ResponderRole;
  assignedAt: number;
  acknowledged: boolean;
}

/** Responder roles */
export type ResponderRole = 'incident_commander' | 'communications' | 'engineering' | 'observer';

/** Post-mortem document */
export interface PostMortem {
  incidentId: string;
  title: string;
  sections: PostMortemSection[];
  createdAt: number;
  author: string;
  status: 'draft' | 'review' | 'published';
}

/** Post-mortem section */
export interface PostMortemSection {
  title: string;
  content: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Deployment Types
// ---------------------------------------------------------------------------

/** Deployment record */
export interface Deployment {
  id: string;
  service: string;
  version: string;
  previousVersion: string;
  strategy: DeploymentStrategy;
  status: DeploymentStatus;
  initiatedBy: string;
  startedAt: number;
  completedAt?: number;
  canaryConfig?: CanaryConfig;
  rollbackInfo?: RollbackInfo;
  approvals: ApprovalRecord[];
  metricsGates: MetricsGate[];
}

/** Deployment strategies */
export type DeploymentStrategy = 'blue_green' | 'canary' | 'rolling' | 'recreate';

/** Deployment status */
export type DeploymentStatus = 'pending_approval' | 'in_progress' | 'canary_testing' | 'promoting' | 'completed' | 'rolled_back' | 'failed';

/** Canary deployment configuration */
export interface CanaryConfig {
  initialPercentage: number;
  incrementPercentage: number;
  intervalMs: number;
  maxPercentage: number;
  currentPercentage: number;
  metricsGates: MetricsGate[];
}

/** Metrics gate for deployments */
export interface MetricsGate {
  metric: string;
  operator: 'lt' | 'gt' | 'lte' | 'gte';
  threshold: number;
  window: string;
  currentValue?: number;
  passed?: boolean;
}

/** Rollback information */
export interface RollbackInfo {
  rolledBackAt: number;
  reason: string;
  initiatedBy: string;
  targetVersion: string;
  automatic: boolean;
}

/** Approval workflow */
export interface ApprovalWorkflow {
  deploymentId: string;
  requiredApprovers: string[];
  approvals: ApprovalRecord[];
  status: 'pending' | 'approved' | 'rejected';
}

/** Individual approval record */
export interface ApprovalRecord {
  approverId: string;
  decision: 'approved' | 'rejected';
  comment: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Migration Types
// ---------------------------------------------------------------------------

/** Migration record */
export interface Migration {
  id: string;
  name: string;
  filename: string;
  direction: MigrationDirection;
  status: MigrationStatus;
  executedAt?: number;
  duration?: number;
  checksum: string;
  batch: number;
}

/** Migration direction */
export type MigrationDirection = 'up' | 'down';

/** Migration execution status */
export type MigrationStatus = 'pending' | 'applied' | 'failed' | 'rolled_back' | 'skipped';

/** Migration file definition */
export interface MigrationFile {
  filename: string;
  timestamp: string;
  sequence: number;
  name: string;
  upOperations: string[];
  downOperations: string[];
}

/** Result of a batch migration */
export interface BatchResult {
  successful: Migration[];
  failed?: Migration;
  error?: string;
  rolledBack: boolean;
  duration: number;
}

// ---------------------------------------------------------------------------
// Background Job Types
// ---------------------------------------------------------------------------

/** Background job */
export interface BackgroundJob {
  id: string;
  name: string;
  queue: string;
  data: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  duration?: number;
  result?: unknown;
}

/** Job execution status */
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'dead' | 'delayed' | 'paused';

/** Job queue definition */
export interface JobQueue {
  name: string;
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
  paused: boolean;
  createdAt: number;
}

/** Queue statistics */
export interface QueueStats {
  queueName: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  dead: number;
  delayed: number;
  throughputPerMinute: number;
  avgProcessingTimeMs: number;
}

/** Job retry configuration */
export interface JobRetry {
  jobId: string;
  attempt: number;
  maxAttempts: number;
  delay: number;
  backoffMultiplier: number;
  nextRetryAt: number;
}

/** Job execution history entry */
export interface JobHistory {
  jobId: string;
  attempt: number;
  status: JobStatus;
  startedAt: number;
  completedAt: number;
  duration: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Alert Engine Types
// ---------------------------------------------------------------------------

/** Alert rule definition */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: AlertChannel[];
  enabled: boolean;
  cooldownMs: number;
  lastFiredAt?: number;
  createdBy: string;
  createdAt: number;
}

/** Alert condition */
export interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'absence' | 'rate_of_change';
  metric: string;
  operator?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold?: number;
  durationMs?: number;
  anomalyConfig?: AnomalyConfig;
}

/** Alert severity levels */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/** Alert notification channel */
export interface AlertChannel {
  type: AlertChannelType;
  target: string;
  config: Record<string, unknown>;
}

/** Channel types for alert routing */
export type AlertChannelType = 'email' | 'slack' | 'pagerduty' | 'sms' | 'webhook';

/** Alert instance status */
export interface AlertStatus {
  id: string;
  ruleId: string;
  status: AlertState;
  firedAt: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  snoozedUntil?: number;
  value: number;
  message: string;
}

/** Alert state */
export type AlertState = 'firing' | 'acknowledged' | 'resolved' | 'snoozed';

/** Anomaly detection configuration */
export interface AnomalyConfig {
  sensitivity: number;
  windowSize: number;
  minDataPoints: number;
  seasonalityPeriod?: number;
}

/** Z-score calculation result */
export interface ZScoreResult {
  value: number;
  mean: number;
  stddev: number;
  zScore: number;
  isAnomaly: boolean;
}

// ---------------------------------------------------------------------------
// Audit Trail Types
// ---------------------------------------------------------------------------

/** Audit log entry */
export interface AuditEntry {
  id: string;
  actor: string;
  actorType: ActorType;
  action: AuditAction;
  target: string;
  targetType: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  hash: string;
  previousHash: string;
}

/** Actor type */
export type ActorType = 'admin' | 'system' | 'api' | 'scheduler';

/** Audit action categories */
export type AuditAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'impersonate'
  | 'approve' | 'reject' | 'escalate'
  | 'deploy' | 'rollback' | 'configure'
  | 'ban' | 'suspend' | 'restore'
  | 'export' | 'import';

/** Filter for querying audit logs */
export interface AuditFilter {
  actor?: string;
  action?: AuditAction;
  targetType?: string;
  target?: string;
  dateFrom?: number;
  dateTo?: number;
  page: number;
  pageSize: number;
}

/** Chain verification for tamper evidence */
export interface AuditChain {
  entries: AuditEntry[];
  genesisHash: string;
  lastHash: string;
  length: number;
  verified: boolean;
}

/** Audit export configuration */
export interface AuditExport {
  id: string;
  filter: AuditFilter;
  format: 'json' | 'csv';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  createdAt: number;
  completedAt?: number;
  entryCount: number;
}

// ---------------------------------------------------------------------------
// Revenue Dashboard Types
// ---------------------------------------------------------------------------

/** Revenue snapshot */
export interface RevenueSnapshot {
  period: string;
  revenue: number;
  previousPeriodRevenue: number;
  growthRate: number;
  transactionCount: number;
  avgTransactionValue: number;
  timestamp: number;
}

/** Subscription metrics */
export interface SubscriptionMetric {
  period: string;
  newSubscriptions: number;
  churned: number;
  expanded: number;
  contracted: number;
  netNew: number;
  mrr: number;
  mrrGrowth: number;
  arr: number;
}

/** Refund metrics */
export interface RefundMetric {
  period: string;
  refundCount: number;
  refundTotal: number;
  refundRate: number;
  reasonBreakdown: Record<string, number>;
  avgRefundAmount: number;
}

/** Revenue forecast */
export interface RevenueForecast {
  periods: ForecastPeriod[];
  confidence: number;
  model: string;
  generatedAt: number;
}

/** Single forecast period */
export interface ForecastPeriod {
  period: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

/** Revenue by segment */
export interface RevenueBySegment {
  segment: string;
  segmentType: 'plan' | 'region' | 'channel';
  revenue: number;
  percentage: number;
  growth: number;
  userCount: number;
}

// ---------------------------------------------------------------------------
// Support Ticket Types
// ---------------------------------------------------------------------------

/** Support ticket */
export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assignedTo?: string;
  createdAt: number;
  updatedAt: number;
  firstResponseAt?: number;
  resolvedAt?: number;
  responses: TicketResponse[];
  tags: string[];
  sla: TicketSLA;
}

/** Ticket lifecycle status */
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'waiting_customer' | 'escalated' | 'resolved' | 'closed';

/** Ticket priority */
export type TicketPriority = 'urgent' | 'high' | 'medium' | 'low';

/** Ticket category */
export type TicketCategory = 'billing' | 'technical' | 'account' | 'feature_request' | 'bug_report' | 'general';

/** SLA configuration and tracking */
export interface TicketSLA {
  firstResponseTarget: number;
  resolutionTarget: number;
  firstResponseMet?: boolean;
  resolutionMet?: boolean;
  breachRisk: boolean;
}

/** Ticket response */
export interface TicketResponse {
  id: string;
  ticketId: string;
  author: string;
  authorType: 'agent' | 'customer' | 'system';
  content: string;
  internal: boolean;
  timestamp: number;
  attachments: string[];
}

/** Escalation rule */
export interface EscalationRule {
  id: string;
  name: string;
  condition: EscalationCondition;
  action: EscalationAction;
  enabled: boolean;
}

/** Escalation condition */
export interface EscalationCondition {
  type: 'time_exceeded' | 'priority_change' | 'customer_request' | 'sla_breach';
  threshold?: number;
  priority?: TicketPriority;
}

/** Escalation action */
export interface EscalationAction {
  assignTo?: string;
  notifyManagers: boolean;
  changePriority?: TicketPriority;
  addTag?: string;
}

/** Customer satisfaction score */
export interface CSATScore {
  ticketId: string;
  score: number;
  feedback?: string;
  submittedAt: number;
}
