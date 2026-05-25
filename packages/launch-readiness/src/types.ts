// ============================================================================
// Launch Readiness Package - Type Definitions
// ============================================================================

// ============================================================================
// SLO Engine Types
// ============================================================================

/** SLO indicator type */
export type SLOIndicatorType = 'availability' | 'latency' | 'error_rate' | 'throughput';

/** SLO window type */
export type SLOWindow = 'rolling_7d' | 'rolling_30d' | 'calendar_month' | 'calendar_quarter';

/** SLO definition */
export interface SLODefinition {
  id: string;
  name: string;
  description: string;
  indicator: SLOIndicatorType;
  target: number;
  window: SLOWindow;
  windowDurationMs: number;
  burnRateThresholds: BurnRateAlert[];
  owner: string;
  relatedSLA?: SLAContract;
}

/** SLA contract */
export interface SLAContract {
  id: string;
  name: string;
  target: number;
  penalty: string;
  measurementWindow: SLOWindow;
  exclusions: string[];
}

/** Error budget state */
export interface ErrorBudget {
  sloId: string;
  totalBudget: number;
  consumed: number;
  remaining: number;
  remainingPercentage: number;
  burnRate: number;
  projectedExhaustionMs: number | null;
  policyAction: BudgetPolicyAction;
}

/** Burn rate measurement */
export interface BurnRate {
  shortWindow: number;
  longWindow: number;
  shortWindowDurationMs: number;
  longWindowDurationMs: number;
  isAlerting: boolean;
  alertSeverity: IncidentSeverity | null;
}

/** Burn rate alert threshold */
export interface BurnRateAlert {
  shortWindowMultiplier: number;
  longWindowMultiplier: number;
  severity: IncidentSeverity;
  action: string;
}

/** Budget policy action */
export type BudgetPolicyAction = 'normal' | 'caution' | 'freeze_deployments' | 'emergency';

/** SLO compliance report */
export interface SLOComplianceReport {
  sloId: string;
  sloName: string;
  period: string;
  target: number;
  achieved: number;
  compliant: boolean;
  totalRequests: number;
  failedRequests: number;
  errorBudgetUsed: number;
  incidents: number;
  longestOutageMs: number;
}

// ============================================================================
// Chaos Engineering Types
// ============================================================================

/** Chaos action type */
export type ChaosActionType =
  | 'latency_injection'
  | 'error_injection'
  | 'memory_pressure'
  | 'cpu_load'
  | 'dependency_failure'
  | 'network_partition';

/** Chaos experiment definition */
export interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  actions: ChaosAction[];
  guards: ChaosGuard[];
  schedule?: ChaosSchedule;
  blastRadius: BlastRadius;
  status: ChaosExperimentStatus;
  results?: ChaosExperimentResult;
}

/** Chaos action */
export interface ChaosAction {
  type: ChaosActionType;
  target: string;
  parameters: ChaosActionParams;
  durationMs: number;
  magnitude: number;
}

/** Chaos action parameters */
export interface ChaosActionParams {
  delayMs?: number;
  affectedPercentage?: number;
  statusCode?: number;
  targetMb?: number;
  targetPercent?: number;
  serviceName?: string;
  fromService?: string;
  toService?: string;
  dropPercentage?: number;
}

/** Safety guard */
export interface ChaosGuard {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  action: 'abort' | 'pause' | 'alert';
  checkIntervalMs: number;
}

/** Chaos schedule */
export interface ChaosSchedule {
  cron: string;
  blackoutWindows: BlackoutWindow[];
  maxConcurrentExperiments: number;
}

/** Blackout window */
export interface BlackoutWindow {
  dayOfWeek?: number[];
  startHour: number;
  endHour: number;
  timezone: string;
}

/** Blast radius control */
export interface BlastRadius {
  maxAffectedPercentage: number;
  allowedRegions: string[];
  excludedServices: string[];
}

/** Experiment status */
export type ChaosExperimentStatus = 'planned' | 'running' | 'completed' | 'aborted' | 'failed';

/** Experiment result */
export interface ChaosExperimentResult {
  hypothesisVerified: boolean;
  steadyStateMetrics: Record<string, number>;
  duringChaosMetrics: Record<string, number>;
  recoveryTimeMs: number;
  findings: string[];
  completedAt: number;
}

// ============================================================================
// Load Test Types
// ============================================================================

/** Load pattern type */
export type LoadPatternType = 'constant' | 'ramp' | 'spike' | 'stress' | 'soak';

/** Load test configuration */
export interface LoadTestConfig {
  id: string;
  name: string;
  targetUrl: string;
  pattern: LoadPattern;
  durationMs: number;
  virtualUsers: number;
  thinkTimeMs: number;
  timeout: number;
  headers?: Record<string, string>;
}

/** Load pattern */
export interface LoadPattern {
  type: LoadPatternType;
  startRps: number;
  endRps?: number;
  spikeRps?: number;
  spikeDurationMs?: number;
  rampSteps?: number;
  holdDurationMs?: number;
}

/** Load test result */
export interface LoadTestResult {
  configId: string;
  startedAt: number;
  completedAt: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  latency: LatencyPercentiles;
  throughput: ThroughputMetrics;
  errorRate: number;
  errorsByCategory: Record<string, number>;
  apdexScore: number;
  saturationPoint: number | null;
  littleLawVerification: LittleLawResult;
}

/** Latency percentile metrics */
export interface LatencyPercentiles {
  min: number;
  max: number;
  mean: number;
  standardDeviation: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
}

/** Throughput metrics */
export interface ThroughputMetrics {
  requestsPerSecond: number;
  bytesPerSecond: number;
  peakRps: number;
  sustainedRps: number;
}

/** Little's Law verification */
export interface LittleLawResult {
  observedConcurrency: number;
  predictedConcurrency: number;
  arrivalRate: number;
  avgResponseTime: number;
  deviationPercentage: number;
  isValid: boolean;
}

// ============================================================================
// Deployment Strategy Types
// ============================================================================

/** Deployment strategy type */
export type DeploymentStrategyType = 'blue_green' | 'canary' | 'rolling' | 'recreate';

/** Deployment strategy configuration */
export interface DeploymentStrategy {
  type: DeploymentStrategyType;
  stages: DeploymentStage[];
  rollbackTriggers: RollbackTrigger[];
  approvalRequired: boolean;
  maxDeploymentTimeMs: number;
}

/** Deployment stage */
export interface DeploymentStage {
  name: string;
  trafficPercentage: number;
  holdDurationMs: number;
  autoAdvance: boolean;
  metricsToCheck: string[];
}

/** Canary configuration */
export interface CanaryConfig {
  stages: DeploymentStage[];
  comparisonWindowMs: number;
  minSampleSize: number;
  confidenceLevel: number;
  baselineService: string;
  canaryService: string;
}

/** Canary metrics comparison */
export interface CanaryMetrics {
  stage: string;
  baselineErrorRate: number;
  canaryErrorRate: number;
  baselineLatencyP99: number;
  canaryLatencyP99: number;
  chiSquared: number;
  pValue: number;
  isSignificant: boolean;
  recommendation: 'advance' | 'rollback' | 'hold';
}

/** Rollback trigger */
export interface RollbackTrigger {
  metric: string;
  condition: 'absolute' | 'relative';
  threshold: number;
  baselineMultiplier?: number;
  windowMs: number;
}

/** Blue-green deployment state */
export interface BlueGreenState {
  activeEnvironment: 'blue' | 'green';
  blueVersion: string;
  greenVersion: string;
  blueHealthy: boolean;
  greenHealthy: boolean;
  lastSwitchAt: number;
  trafficDistribution: { blue: number; green: number };
}

/** Deployment velocity tracking */
export interface DeploymentVelocity {
  commitToDeployMs: number;
  deployToProductionMs: number;
  rollbackTimeMs: number;
  deploymentsPerDay: number;
  successRate: number;
}

// ============================================================================
// Capacity Planning Types
// ============================================================================

/** Capacity plan */
export interface CapacityPlan {
  id: string;
  name: string;
  generatedAt: number;
  forecastHorizonDays: number;
  resources: ResourceRequirement[];
  scaling: ScalingConfig;
  costEstimate: CostEstimate;
  headroom: HeadroomConfig;
  recommendations: CapacityRecommendation[];
}

/** Resource requirement */
export interface ResourceRequirement {
  resourceType: 'cpu' | 'memory' | 'network' | 'storage' | 'connections';
  currentUsage: number;
  projectedUsage: number;
  maxCapacity: number;
  utilizationPercent: number;
  unit: string;
}

/** Scaling configuration */
export interface ScalingConfig {
  targetUtilization: number;
  minInstances: number;
  maxInstances: number;
  scaleUpCooldownMs: number;
  scaleDownCooldownMs: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

/** Cost estimate */
export interface CostEstimate {
  monthlyOnDemand: number;
  monthlyReserved: number;
  monthlySpot: number;
  instanceType: string;
  instanceCount: number;
  costPerInstance: number;
}

/** Headroom configuration */
export interface HeadroomConfig {
  normalBurstMultiplier: number;
  viralEventMultiplier: number;
  headroomPercentage: number;
}

/** Capacity recommendation */
export interface CapacityRecommendation {
  type: 'scale_up' | 'scale_down' | 'upgrade_instance' | 'add_replicas' | 'optimize';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  estimatedCostImpact: number;
  estimatedPerformanceImpact: number;
}

/** Database connection pool sizing */
export interface ConnectionPoolConfig {
  poolSize: number;
  maxWaitTimeMs: number;
  offeredLoad: number;
  servers: number;
  waitProbability: number;
  utilizationPercent: number;
}

// ============================================================================
// Runbook Engine Types
// ============================================================================

/** Incident severity */
export type IncidentSeverity = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

/** Runbook definition */
export interface RunbookDefinition {
  id: string;
  name: string;
  description: string;
  triggerConditions: string[];
  severity: IncidentSeverity;
  steps: RunbookStep[];
  verification: string;
  rollback: string;
  escalationChain: EscalationLevel[];
  owner: string;
  lastUpdated: number;
}

/** Runbook step */
export interface RunbookStep {
  id: string;
  order: number;
  type: 'manual' | 'automated' | 'decision';
  title: string;
  description: string;
  command?: string;
  timeoutMs?: number;
  successCriteria?: string;
  decisionBranches?: DecisionBranch[];
}

/** Decision branch for conditional steps */
export interface DecisionBranch {
  condition: string;
  nextStepId: string;
  label: string;
}

/** Escalation level */
export interface EscalationLevel {
  level: number;
  respondersGroup: string;
  acknowledgeWithinMs: number;
  resolveWithinMs: number;
  notificationChannels: string[];
}

/** Health check definition */
export interface HealthCheck {
  id: string;
  name: string;
  endpoint: string;
  intervalMs: number;
  timeoutMs: number;
  expectedStatus: number;
  tags: string[];
}

/** Health status */
export interface HealthStatus {
  checkId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheckedAt: number;
  responseTimeMs: number;
  consecutiveFailures: number;
  message?: string;
}

/** Runbook execution record */
export interface RunbookExecution {
  id: string;
  runbookId: string;
  startedAt: number;
  completedAt?: number;
  status: 'in_progress' | 'completed' | 'failed' | 'escalated';
  currentStepId: string;
  stepResults: StepExecutionResult[];
  executedBy: string;
  incidentId?: string;
}

/** Step execution result */
export interface StepExecutionResult {
  stepId: string;
  status: 'success' | 'failed' | 'skipped' | 'timeout';
  startedAt: number;
  completedAt: number;
  output?: string;
  error?: string;
}

/** Post-incident review */
export interface PostIncidentReview {
  incidentId: string;
  title: string;
  severity: IncidentSeverity;
  timeline: TimelineEntry[];
  impact: string;
  rootCause: string;
  contributingFactors: string[];
  actionItems: ActionItem[];
  lessonsLearned: string[];
  generatedAt: number;
}

/** Timeline entry */
export interface TimelineEntry {
  timestamp: number;
  event: string;
  actor: string;
}

/** Action item */
export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: number;
  status: 'open' | 'in_progress' | 'completed';
}

/** On-call rotation */
export interface OnCallRotation {
  id: string;
  teamName: string;
  members: string[];
  currentOnCall: string;
  rotationIntervalMs: number;
  nextRotationAt: number;
  overrides: OnCallOverride[];
}

/** On-call override */
export interface OnCallOverride {
  person: string;
  startAt: number;
  endAt: number;
  reason: string;
}
