// ============================================================================
// Moderation - Image Moderator
// Simulated image moderation with hash-based detection and metadata analysis
// ============================================================================

import type {
  ContentCategory,
  ModerationAction,
  ModerationResult,
  CategoryScore,
  ImageMetadata,
} from '../types';

interface ImageModeratorConfig {
  nudityThreshold: number;
  violenceThreshold: number;
  autoRemoveThreshold: number;
  maxImageSize: number;
  enableHashMatching: boolean;
  enableMetadataAnalysis: boolean;
}

const DEFAULT_CONFIG: ImageModeratorConfig = {
  nudityThreshold: 0.7,
  violenceThreshold: 0.75,
  autoRemoveThreshold: 0.9,
  maxImageSize: 50 * 1024 * 1024,
  enableHashMatching: true,
  enableMetadataAnalysis: true,
};

interface ImageAnalysis {
  nudityScore: number;
  violenceScore: number;
  contentRating: 'G' | 'PG' | 'PG-13' | 'R' | 'X';
  hasWatermark: boolean;
  dominantColors: string[];
  objectsDetected: string[];
  textDetected: string[];
}

/**
 * ImageModerator - Image content moderation engine
 *
 * Provides simulated image moderation using perceptual hash matching
 * for known-bad content, metadata analysis, and property-based scoring
 * for nudity, violence, and other content policy violations.
 */
export class ImageModerator {
  private config: ImageModeratorConfig;
  private knownBadHashes: Map<string, { category: ContentCategory; confidence: number }>;
  private moderationHistory: Map<string, ModerationResult>;
  private hashIndex: Map<string, string[]>;
  private batchQueue: { imageId: string; metadata: ImageMetadata }[];

  constructor(config: Partial<ImageModeratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.knownBadHashes = new Map();
    this.moderationHistory = new Map();
    this.hashIndex = new Map();
    this.batchQueue = [];
    this.initializeKnownBadHashes();
  }

  /** Moderate a single image */
  async moderate(imageId: string, metadata: ImageMetadata): Promise<ModerationResult> {
    // Check known bad hashes first
    if (this.config.enableHashMatching) {
      const hashMatch = this.knownBadHashes.get(metadata.hash);
      if (hashMatch) {
        return this.createResult(imageId, [{
          category: hashMatch.category,
          score: hashMatch.confidence,
          confidence: 0.99,
          detected: true,
          evidence: ['Matched known bad content hash'],
        }], 'remove');
      }
    }

    // Analyze image properties
    const analysis = this.analyzeImage(metadata);
    const categories = this.buildCategoryScores(analysis);
    const overallScore = Math.max(...categories.map(c => c.score));
    const action = this.determineAction(overallScore, categories);

    const result = this.createResult(imageId, categories, action);
    this.moderationHistory.set(imageId, result);
    return result;
  }

  /** Detect nudity likelihood based on image properties */
  async detectNudity(metadata: ImageMetadata): Promise<{ score: number; confidence: number; regions: { x: number; y: number; w: number; h: number; score: number }[] }> {
    // Simulate nudity detection based on image properties
    let score = 0;
    const regions: { x: number; y: number; w: number; h: number; score: number }[] = [];

    // Aspect ratio analysis - certain ratios more likely for portrait/body shots
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio >= 0.5 && aspectRatio <= 0.8) score += 0.1;

    // File size relative to resolution (high detail = higher risk)
    const pixelCount = metadata.width * metadata.height;
    const bytesPerPixel = metadata.fileSize / pixelCount;
    if (bytesPerPixel > 3) score += 0.05;

    // Simulate region detection
    if (score > 0.05) {
      regions.push({
        x: Math.floor(metadata.width * 0.2),
        y: Math.floor(metadata.height * 0.1),
        w: Math.floor(metadata.width * 0.6),
        h: Math.floor(metadata.height * 0.8),
        score: score * 2,
      });
    }

    return { score: Math.min(1, score), confidence: 0.6, regions };
  }

  /** Detect violence in image */
  async detectViolence(metadata: ImageMetadata): Promise<{ score: number; confidence: number; indicators: string[] }> {
    const indicators: string[] = [];
    let score = 0;

    // Simulate violence detection via color analysis
    // Dark images with high contrast may indicate violent content
    if (metadata.fileSize > 1024 * 1024 && metadata.width > 1000) {
      score += 0.05;
      indicators.push('High resolution dark content');
    }

    // Check against known violent content hashes
    const hashPrefix = metadata.hash.substring(0, 8);
    const similarHashes = this.hashIndex.get(hashPrefix) || [];
    if (similarHashes.length > 0) {
      score += 0.3;
      indicators.push('Similar to flagged content');
    }

    return { score: Math.min(1, score), confidence: 0.55, indicators };
  }

  /** Check for watermarks in image */
  async checkWatermarks(metadata: ImageMetadata): Promise<{ hasWatermark: boolean; confidence: number; type?: string }> {
    // Simulate watermark detection via metadata and pattern analysis
    if (metadata.hasWatermark) {
      return { hasWatermark: true, confidence: 0.9, type: 'visual_overlay' };
    }

    // Check EXIF data for copyright info
    if (metadata.hasExif) {
      return { hasWatermark: false, confidence: 0.7, type: 'exif_copyright' };
    }

    return { hasWatermark: false, confidence: 0.5 };
  }

  /** Get content rating for an image */
  async getContentRating(metadata: ImageMetadata): Promise<{ rating: 'G' | 'PG' | 'PG-13' | 'R' | 'X'; confidence: number; reasons: string[] }> {
    const analysis = this.analyzeImage(metadata);
    const reasons: string[] = [];

    if (analysis.nudityScore >= 0.8) {
      reasons.push('Explicit nudity detected');
      return { rating: 'X', confidence: 0.85, reasons };
    }
    if (analysis.nudityScore >= 0.5 || analysis.violenceScore >= 0.7) {
      reasons.push(analysis.nudityScore >= 0.5 ? 'Partial nudity' : 'Graphic violence');
      return { rating: 'R', confidence: 0.75, reasons };
    }
    if (analysis.violenceScore >= 0.4 || analysis.nudityScore >= 0.3) {
      reasons.push('Moderate content');
      return { rating: 'PG-13', confidence: 0.7, reasons };
    }
    if (analysis.violenceScore >= 0.2) {
      reasons.push('Mild themes');
      return { rating: 'PG', confidence: 0.8, reasons };
    }

    return { rating: 'G', confidence: 0.9, reasons: ['General audience content'] };
  }

  /** Batch moderate multiple images */
  async batchModerate(images: { imageId: string; metadata: ImageMetadata }[]): Promise<ModerationResult[]> {
    const results: ModerationResult[] = [];
    for (const image of images) {
      const result = await this.moderate(image.imageId, image.metadata);
      results.push(result);
    }
    return results;
  }

  /** Get confidence for a previous moderation */
  async getConfidence(imageId: string): Promise<{ overall: number; breakdown: { category: string; confidence: number }[] } | null> {
    const result = this.moderationHistory.get(imageId);
    if (!result) return null;

    return {
      overall: result.confidence,
      breakdown: result.categories.map(c => ({ category: c.category, confidence: c.confidence })),
    };
  }

  /** Add hash to known-bad database */
  addKnownBadHash(hash: string, category: ContentCategory, confidence: number = 0.99): void {
    this.knownBadHashes.set(hash, { category, confidence });
    const prefix = hash.substring(0, 8);
    const existing = this.hashIndex.get(prefix) || [];
    existing.push(hash);
    this.hashIndex.set(prefix, existing);
  }

  // --- Private Methods ---

  private analyzeImage(metadata: ImageMetadata): ImageAnalysis {
    const pixelCount = metadata.width * metadata.height;
    const bytesPerPixel = metadata.fileSize / Math.max(1, pixelCount);

    // Simulate scoring based on image properties
    let nudityScore = 0;
    let violenceScore = 0;

    // High resolution images with certain aspect ratios
    const aspectRatio = metadata.width / Math.max(1, metadata.height);
    if (aspectRatio >= 0.6 && aspectRatio <= 0.85) nudityScore += 0.1;
    if (bytesPerPixel > 4) nudityScore += 0.05;

    // Hash proximity to known bad content
    const hashPrefix = metadata.hash.substring(0, 8);
    if (this.hashIndex.has(hashPrefix)) {
      nudityScore += 0.3;
      violenceScore += 0.2;
    }

    const contentRating = nudityScore >= 0.8 ? 'X' as const
      : nudityScore >= 0.5 ? 'R' as const
      : violenceScore >= 0.4 ? 'PG-13' as const
      : 'G' as const;

    return {
      nudityScore: Math.min(1, nudityScore),
      violenceScore: Math.min(1, violenceScore),
      contentRating,
      hasWatermark: metadata.hasWatermark,
      dominantColors: [],
      objectsDetected: [],
      textDetected: [],
    };
  }

  private buildCategoryScores(analysis: ImageAnalysis): CategoryScore[] {
    return [
      { category: 'nsfw', score: analysis.nudityScore, confidence: 0.7, detected: analysis.nudityScore >= this.config.nudityThreshold },
      { category: 'violence', score: analysis.violenceScore, confidence: 0.65, detected: analysis.violenceScore >= this.config.violenceThreshold },
      { category: 'copyright', score: analysis.hasWatermark ? 0.4 : 0, confidence: 0.8, detected: analysis.hasWatermark },
    ];
  }

  private determineAction(score: number, categories: CategoryScore[]): ModerationAction {
    if (score >= this.config.autoRemoveThreshold) return 'remove';
    if (categories.some(c => c.detected && c.score >= 0.8)) return 'flag';
    if (categories.some(c => c.detected)) return 'age_restrict';
    return 'approve';
  }

  private createResult(imageId: string, categories: CategoryScore[], action: ModerationAction): ModerationResult {
    return {
      id: `imgmod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId: imageId,
      contentType: 'image',
      categories,
      overallScore: Math.max(...categories.map(c => c.score), 0),
      action,
      confidence: categories.reduce((sum, c) => sum + c.confidence, 0) / Math.max(1, categories.length),
      automated: true,
      flags: categories.filter(c => c.detected).map(c => c.category),
      metadata: {},
      createdAt: Date.now(),
    };
  }

  private initializeKnownBadHashes(): void {
    // Seed with example known-bad hashes (simulated)
    const seedHashes = [
      { hash: 'abc123def456', category: 'nsfw' as ContentCategory },
      { hash: 'xyz789ghi012', category: 'violence' as ContentCategory },
      { hash: 'jkl345mno678', category: 'illegal' as ContentCategory },
    ];
    for (const seed of seedHashes) {
      this.addKnownBadHash(seed.hash, seed.category);
    }
  }
}
