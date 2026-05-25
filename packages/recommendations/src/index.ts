// ============================================================================
// Recommendations Package - Barrel Export
// ============================================================================

export { CollaborativeFilter } from './core/collaborative-filtering';
export { ContentBasedFilter } from './core/content-based-filter';
export { HybridEngine } from './core/hybrid-engine';
export { NeuralCF } from './core/neural-cf';
export { MatrixFactorizer } from './core/matrix-factorization';
export { RealtimePersonalizer } from './core/realtime-personalizer';
export { CrossAppRecommender } from './core/cross-app-recommender';
export { TrendingDetector } from './core/trending-detector';
export { DiversityInjector } from './core/diversity-injector';
export { FeedbackProcessor } from './core/feedback-processor';
export { ContextEngine } from './core/context-engine';
export { ColdStartHandler } from './core/cold-start-handler';
export { RecommendationABTest } from './core/recommendation-ab';
export { FeedRanker } from './core/feed-ranker';
export { ContentGraph } from './core/content-graph';
export { ExploreDiscovery } from './core/explore-discovery';

export type {
  UserProfile,
  UserDemographics,
  UserInteraction,
  InteractionType,
  InteractionContext,
  ItemProfile,
  ItemMetadata,
  Rating,
  SimilarityScore,
  SimilarityMethod,
  RecommendationResult,
  RecommendedItem,
  RecommendationReason,
  ExplanationType,
  CollaborativeConfig,
  ContentFilterConfig,
  HybridConfig,
  BlendingStrategy,
  MatrixFactorizationConfig,
  LatentFactor,
  NCFConfig,
  NCFLayer,
  ActivationType,
  ColdStartConfig,
  ColdStartStrategy,
  DiversityConfig,
  MMRConfig,
  SessionSignal,
  PersonalizationConfig,
  BanditStrategy,
  ABVariant,
  TestMetrics,
  FeedbackEvent,
  FeedbackType,
  CrossAppMapping,
  TrendingItem,
  VelocityScore,
  ContextFeatures,
  TimeOfDay,
  DeviceType,
  ExplanationConfig,
  Explanation,
  FeatureContribution,
  FeedRankConfig,
  FeedItem,
  RankSignals,
  ContentNode,
  ContentEdge,
  ContentRelationType,
  GraphWalkConfig,
  ExplorationConfig,
  SerendipityConfig,
  NoveltyScore,
  DiscoveryFeedConfig,
} from './types';
