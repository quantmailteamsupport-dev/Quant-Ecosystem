// ============================================================================
// Moderation - Content Classifier
// Simulated ML classifier with keyword scoring and confidence thresholds
// ============================================================================

import type {
  ContentCategory,
  ContentType,
  CategoryScore,
  ModerationResult,
  ModerationAction,
  ModerationConfig,
} from '../types';

interface ClassifierConfig {
  autoRemoveThreshold: number;
  autoFlagThreshold: number;
  minConfidence: number;
  batchSize: number;
  defaultAction: ModerationAction;
}

const DEFAULT_CONFIG: ClassifierConfig = {
  autoRemoveThreshold: 0.9,
  autoFlagThreshold: 0.6,
  minConfidence: 0.3,
  batchSize: 100,
  defaultAction: 'approve',
};

interface TrainingData {
  text: string;
  categories: ContentCategory[];
  weight: number;
}

interface ModelMetrics {
  totalClassified: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

/** Keyword patterns mapped to content categories */
const CATEGORY_KEYWORDS: Record<ContentCategory, { keywords: string[]; weight: number }[]> = {
  safe: [],
  nsfw: [
    { keywords: ['explicit', 'nude', 'sexual', 'adult', 'xxx', 'porn'], weight: 0.9 },
    { keywords: ['suggestive', 'provocative', 'intimate', 'sensual'], weight: 0.5 },
  ],
  violence: [
    { keywords: ['kill', 'murder', 'attack', 'assault', 'torture', 'gore'], weight: 0.85 },
    { keywords: ['fight', 'punch', 'weapon', 'blood', 'wound'], weight: 0.5 },
  ],
  hate_speech: [
    { keywords: ['supremacy', 'inferior', 'subhuman', 'genocide', 'ethnic_cleansing'], weight: 0.95 },
    { keywords: ['slur_placeholder_1', 'slur_placeholder_2', 'derogatory_placeholder'], weight: 0.85 },
  ],
  spam: [
    { keywords: ['buy now', 'limited offer', 'click here', 'free money', 'act now'], weight: 0.7 },
    { keywords: ['discount', 'promo', 'subscribe', 'follow back', 'dm me'], weight: 0.3 },
  ],
  harassment: [
    { keywords: ['threaten', 'stalk', 'doxx', 'harass', 'bully', 'intimidate'], weight: 0.85 },
    { keywords: ['ugly', 'stupid', 'worthless', 'loser', 'pathetic'], weight: 0.4 },
  ],
  self_harm: [
    { keywords: ['suicide', 'self_harm_placeholder', 'end_it', 'no_reason_to_live'], weight: 0.95 },
    { keywords: ['cutting_placeholder', 'hurting_self_placeholder'], weight: 0.8 },
  ],
  misinformation: [
    { keywords: ['fake_cure', 'conspiracy', 'cover_up', 'they_dont_want_you_to_know'], weight: 0.6 },
    { keywords: ['miracle', 'guaranteed', 'scientists_hate'], weight: 0.4 },
  ],
  copyright: [
    { keywords: ['pirated', 'cracked', 'leaked', 'torrent', 'warez'], weight: 0.8 },
    { keywords: ['download_free', 'full_movie', 'no_copyright'], weight: 0.5 },
  ],
  illegal: [
    { keywords: ['illegal_activity_placeholder', 'contraband', 'trafficking'], weight: 0.95 },
    { keywords: ['black_market', 'underground', 'untraceable'], weight: 0.6 },
  ],
  drugs: [
    { keywords: ['drug_placeholder_1', 'drug_placeholder_2', 'dealer', 'supplier'], weight: 0.8 },
    { keywords: ['high', 'trip', 'dose', 'stash'], weight: 0.3 },
  ],
  weapons: [
    { keywords: ['gun_sale', 'ammunition', 'explosive', 'bomb_making'], weight: 0.9 },
    { keywords: ['firearm', 'rifle', 'automatic', 'silencer'], weight: 0.5 },
  ],
  profanity: [
    { keywords: ['profanity_placeholder_1', 'profanity_placeholder_2', 'profanity_placeholder_3'], weight: 0.7 },
    { keywords: ['mild_profanity_1', 'mild_profanity_2'], weight: 0.3 },
  ],
};

/**
 * ContentClassifier - AI-powered content classification engine
 *
 * Uses keyword-based scoring with weighted patterns, confidence
 * thresholds, and batch processing. Supports training data ingestion
 * and model metrics tracking for continuous improvement.
 */
export class ContentClassifier {
  private config: ClassifierConfig;
  private trainingData: TrainingData[];
  private customPatterns: Map<ContentCategory, RegExp[]>;
  private metrics: ModelMetrics;
  private classificationHistory: Map<string, ModerationResult>;
  private categoryWeights: Map<ContentCategory, number>;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.trainingData = [];
    this.customPatterns = new Map();
    this.classificationHistory = new Map();
    this.categoryWeights = new Map();
    this.metrics = {
      totalClassified: 0,
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
    };
    this.initializeCategoryWeights();
  }

  /** Classify content text and return moderation result */
  async classify(contentId: string, text: string, contentType: ContentType = 'text'): Promise<ModerationResult> {
    const categories = this.scoreCategories(text);
    const overallScore = this.calculateOverallScore(categories);
    const action = this.determineAction(overallScore, categories);
    const confidence = this.calculateConfidence(categories);

    const result: ModerationResult = {
      id: `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId,
      contentType,
      categories,
      overallScore,
      action,
      confidence,
      automated: true,
      flags: categories.filter(c => c.detected).map(c => c.category),
      metadata: { textLength: text.length, wordCount: text.split(/\s+/).length },
      createdAt: Date.now(),
    };

    this.classificationHistory.set(contentId, result);
    this.metrics.totalClassified++;
    return result;
  }

  /** Get confidence breakdown for a classification */
  async getConfidence(contentId: string): Promise<{ overall: number; byCategory: { category: ContentCategory; confidence: number }[] } | null> {
    const result = this.classificationHistory.get(contentId);
    if (!result) return null;

    return {
      overall: result.confidence,
      byCategory: result.categories.map(c => ({
        category: c.category,
        confidence: c.confidence,
      })),
    };
  }

  /** Batch classify multiple content items */
  async batchClassify(items: { contentId: string; text: string; contentType?: ContentType }[]): Promise<ModerationResult[]> {
    const results: ModerationResult[] = [];
    const batchSize = this.config.batchSize;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      for (const item of batch) {
        const result = await this.classify(item.contentId, item.text, item.contentType || 'text');
        results.push(result);
      }
    }

    return results;
  }

  /** Add training data to improve classification */
  async addTrainingData(data: { text: string; categories: ContentCategory[]; weight?: number }[]): Promise<{ added: number; total: number }> {
    for (const item of data) {
      this.trainingData.push({
        text: item.text.toLowerCase(),
        categories: item.categories,
        weight: item.weight || 1,
      });
    }
    return { added: data.length, total: this.trainingData.length };
  }

  /** Retrain model with accumulated training data */
  async trainModel(): Promise<{ success: boolean; dataPoints: number; metrics: ModelMetrics }> {
    // Simulate training by updating category weights based on training data
    const categoryHits: Map<ContentCategory, number> = new Map();

    for (const data of this.trainingData) {
      for (const category of data.categories) {
        categoryHits.set(category, (categoryHits.get(category) || 0) + data.weight);
      }
    }

    // Adjust weights based on frequency
    for (const [category, hits] of categoryHits) {
      const normalizedWeight = Math.min(1, hits / this.trainingData.length);
      this.categoryWeights.set(category, normalizedWeight);
    }

    return {
      success: true,
      dataPoints: this.trainingData.length,
      metrics: this.metrics,
    };
  }

  /** Get current model metrics */
  async getModelMetrics(): Promise<ModelMetrics> {
    // Recalculate derived metrics
    const tp = this.metrics.truePositives;
    const fp = this.metrics.falsePositives;
    const fn = this.metrics.falseNegatives;
    const tn = this.metrics.trueNegatives;
    const total = tp + fp + fn + tn;

    this.metrics.accuracy = total > 0 ? (tp + tn) / total : 0;
    this.metrics.precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    this.metrics.recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    this.metrics.f1Score = (this.metrics.precision + this.metrics.recall) > 0
      ? 2 * (this.metrics.precision * this.metrics.recall) / (this.metrics.precision + this.metrics.recall)
      : 0;

    return { ...this.metrics };
  }

  /** Add custom regex pattern for a category */
  addPattern(category: ContentCategory, pattern: RegExp): void {
    const patterns = this.customPatterns.get(category) || [];
    patterns.push(pattern);
    this.customPatterns.set(category, patterns);
  }

  /** Record feedback to improve metrics */
  recordFeedback(contentId: string, wasCorrect: boolean, actualCategories?: ContentCategory[]): void {
    const result = this.classificationHistory.get(contentId);
    if (!result) return;

    if (wasCorrect) {
      if (result.action !== 'approve') {
        this.metrics.truePositives++;
      } else {
        this.metrics.trueNegatives++;
      }
    } else {
      if (result.action !== 'approve') {
        this.metrics.falsePositives++;
      } else {
        this.metrics.falseNegatives++;
      }
    }
  }

  // --- Private Methods ---

  private scoreCategories(text: string): CategoryScore[] {
    const lowerText = text.toLowerCase();
    const scores: CategoryScore[] = [];

    const allCategories: ContentCategory[] = [
      'nsfw', 'violence', 'hate_speech', 'spam', 'harassment',
      'self_harm', 'misinformation', 'copyright', 'illegal',
      'drugs', 'weapons', 'profanity',
    ];

    for (const category of allCategories) {
      const score = this.scoreSingleCategory(lowerText, category);
      const confidence = this.calculateCategoryConfidence(score, lowerText.length);
      scores.push({
        category,
        score,
        confidence,
        detected: score >= this.config.minConfidence,
        evidence: score > 0 ? this.getEvidence(lowerText, category) : undefined,
      });
    }

    return scores;
  }

  private scoreSingleCategory(text: string, category: ContentCategory): number {
    let totalScore = 0;
    let matchCount = 0;

    // Check keyword patterns
    const patterns = CATEGORY_KEYWORDS[category] || [];
    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          totalScore += pattern.weight;
          matchCount++;
        }
      }
    }

    // Check custom regex patterns
    const customPatterns = this.customPatterns.get(category) || [];
    for (const regex of customPatterns) {
      if (regex.test(text)) {
        totalScore += 0.7;
        matchCount++;
      }
    }

    // Check training data similarity
    const trainingBoost = this.checkTrainingData(text, category);
    totalScore += trainingBoost;

    // Normalize score to 0-1 range
    const categoryWeight = this.categoryWeights.get(category) || 1;
    return Math.min(1, (totalScore / Math.max(1, matchCount + 1)) * categoryWeight);
  }

  private checkTrainingData(text: string, category: ContentCategory): number {
    let boost = 0;
    for (const data of this.trainingData) {
      if (data.categories.includes(category)) {
        const words = data.text.split(/\s+/);
        const matchingWords = words.filter(w => text.includes(w));
        if (matchingWords.length > words.length * 0.5) {
          boost += 0.3 * data.weight;
        }
      }
    }
    return Math.min(0.5, boost);
  }

  private calculateOverallScore(categories: CategoryScore[]): number {
    const detected = categories.filter(c => c.detected);
    if (detected.length === 0) return 0;
    const maxScore = Math.max(...detected.map(c => c.score));
    const avgScore = detected.reduce((sum, c) => sum + c.score, 0) / detected.length;
    return maxScore * 0.7 + avgScore * 0.3;
  }

  private determineAction(overallScore: number, categories: CategoryScore[]): ModerationAction {
    if (overallScore >= this.config.autoRemoveThreshold) return 'remove';
    if (overallScore >= this.config.autoFlagThreshold) return 'flag';
    const criticalCategories: ContentCategory[] = ['self_harm', 'illegal', 'hate_speech'];
    for (const cat of categories) {
      if (cat.detected && criticalCategories.includes(cat.category) && cat.score > 0.5) {
        return 'flag';
      }
    }
    return this.config.defaultAction;
  }

  private calculateConfidence(categories: CategoryScore[]): number {
    const detected = categories.filter(c => c.detected);
    if (detected.length === 0) return 0.95;
    return detected.reduce((sum, c) => sum + c.confidence, 0) / detected.length;
  }

  private calculateCategoryConfidence(score: number, textLength: number): number {
    const lengthFactor = Math.min(1, textLength / 100);
    return Math.min(1, score * 0.8 + lengthFactor * 0.2);
  }

  private getEvidence(text: string, category: ContentCategory): string[] {
    const evidence: string[] = [];
    const patterns = CATEGORY_KEYWORDS[category] || [];
    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          evidence.push(`Matched keyword: "${keyword}"`);
        }
      }
    }
    return evidence.slice(0, 5);
  }

  private initializeCategoryWeights(): void {
    const categories: ContentCategory[] = [
      'safe', 'nsfw', 'violence', 'hate_speech', 'spam', 'harassment',
      'self_harm', 'misinformation', 'copyright', 'illegal', 'drugs', 'weapons', 'profanity',
    ];
    for (const cat of categories) {
      this.categoryWeights.set(cat, 1);
    }
  }
}
