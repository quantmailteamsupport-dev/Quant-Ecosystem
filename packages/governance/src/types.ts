export type ReviewCadence = 'weekly' | 'monthly' | 'quarterly' | 'annually';

export type PolicyStatus = 'draft' | 'active' | 'deprecated' | 'archived';

export type GateSeverity = 'blocking' | 'warning' | 'informational';

export type SunsetStage =
  | 'proposed'
  | 'approved'
  | 'notified'
  | 'migrating'
  | 'read_only'
  | 'disabled'
  | 'data_deleted';

export type BountyTierName = 'critical' | 'high' | 'medium' | 'low';

export type SafetyCheckStatus = 'passed' | 'failed' | 'warning' | 'skipped';

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  status: PolicyStatus;
  cadence: ReviewCadence;
  owner: string;
  lastReviewedAt: Date;
  nextReviewAt: Date;
  documentUrl: string;
}

export interface ReviewCadenceConfig {
  cadence: ReviewCadence;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfQuarter?: number;
  participants: string[];
  requiredQuorum: number;
}

export interface ReleaseGate {
  id: string;
  name: string;
  description: string;
  severity: GateSeverity;
  check: () => boolean | Promise<boolean>;
}

export interface ReleaseGateResult {
  gateId: string;
  gateName: string;
  passed: boolean;
  severity: GateSeverity;
  message: string;
  checkedAt: Date;
}

export interface ReleaseValidation {
  version: string;
  results: ReleaseGateResult[];
  allPassed: boolean;
  blockingFailures: ReleaseGateResult[];
  warnings: ReleaseGateResult[];
  validatedAt: Date;
}

export interface SunsetCriteria {
  featureId: string;
  featureName: string;
  stage: SunsetStage;
  reason: string;
  activeUsers: number;
  totalUsers: number;
  usagePercentage: number;
  maintenanceCostMonthly: number;
  alternativeFeature?: string;
  notificationDate?: Date;
  sunsetDate?: Date;
  dataExportDeadline?: Date;
}

export interface SunsetEvaluation {
  featureId: string;
  shouldSunset: boolean;
  reasons: string[];
  usagePercentage: number;
  costRatio: number;
  hasAlternative: boolean;
}

export interface MigrationPlan {
  featureId: string;
  targetFeature: string;
  steps: string[];
  automatedMigrationAvailable: boolean;
  estimatedDuration: string;
  dataMapping: Record<string, string>;
}

export interface BugBountyTier {
  name: BountyTierName;
  cvssMin: number;
  cvssMax: number;
  rewardMin: number;
  rewardMax: number;
  responseTimeSla: number; // hours
  fixTimeSla: number; // days
}

export interface SafetyCheck {
  id: string;
  name: string;
  category: string;
  status: SafetyCheckStatus;
  score: number;
  threshold: number;
  details: string;
  checkedAt: Date;
}

export interface SafetyReport {
  modelId: string;
  modelVersion: string;
  checks: SafetyCheck[];
  overallStatus: SafetyCheckStatus;
  passRate: number;
  criticalFailures: SafetyCheck[];
  generatedAt: Date;
}

export interface BiasMetric {
  attribute: string;
  group: string;
  metric: string;
  value: number;
  threshold: number;
  passed: boolean;
}
