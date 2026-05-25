// ============================================================================
// ML Pipeline - Content Quality Scorer
// ============================================================================

import type {
  QualityScore,
  QualityThresholds,
  MinHashConfig,
  QualityMetadata,
  ContentQualityDimension,
} from '../types';

interface EngagementCorrelation {
  featureName: string;
  coefficient: number;
  sampleSize: number;
}

/** Multi-dimensional content quality scoring engine */
export class ContentQualityScorer {
  private thresholds: QualityThresholds;
  private minHashConfig: MinHashConfig;
  private hashCoefficients: Array<{ a: number; b: number }>;
  private documentSignatures: Map<string, number[]>;
  private engagementCorrelations: EngagementCorrelation[];
  private toxicPatterns: Array<{ pattern: RegExp; weight: number; contextWindow: number }>;

  constructor(
    thresholds: Partial<QualityThresholds> = {},
    minHashConfig: Partial<MinHashConfig> = {},
  ) {
    this.thresholds = {
      minReadability: thresholds.minReadability ?? 30,
      minOriginality: thresholds.minOriginality ?? 0.5,
      maxToxicity: thresholds.maxToxicity ?? 0.3,
      minInformationDensity: thresholds.minInformationDensity ?? 0.2,
      minEngagementPotential: thresholds.minEngagementPotential ?? 0.3,
      overallPassThreshold: thresholds.overallPassThreshold ?? 0.5,
    };
    this.minHashConfig = {
      numHashFunctions: minHashConfig.numHashFunctions ?? 128,
      shingleSize: minHashConfig.shingleSize ?? 3,
      jaccardThreshold: minHashConfig.jaccardThreshold ?? 0.7,
      bandSize: minHashConfig.bandSize ?? 4,
      numBands: minHashConfig.numBands ?? 32,
    };
    this.documentSignatures = new Map();
    this.engagementCorrelations = [];
    this.toxicPatterns = this.initializeToxicPatterns();
    this.hashCoefficients = this.initializeHashCoefficients();
  }

  /** Initialize hash function coefficients for MinHash */
  private initializeHashCoefficients(): Array<{ a: number; b: number }> {
    const coefficients: Array<{ a: number; b: number }> = [];
    const prime = 2147483647; // Large prime
    for (let i = 0; i < this.minHashConfig.numHashFunctions; i++) {
      coefficients.push({
        a: Math.floor(Math.random() * (prime - 1)) + 1,
        b: Math.floor(Math.random() * prime),
      });
    }
    return coefficients;
  }

  /** Initialize toxic content patterns with context windows */
  private initializeToxicPatterns(): Array<{
    pattern: RegExp;
    weight: number;
    contextWindow: number;
  }> {
    return [
      { pattern: /\b(hate|hatred)\b/i, weight: 0.8, contextWindow: 5 },
      { pattern: /\b(violent|violence|kill)\b/i, weight: 0.7, contextWindow: 5 },
      { pattern: /\b(abuse|abusive)\b/i, weight: 0.7, contextWindow: 5 },
      { pattern: /\b(threat|threaten)\b/i, weight: 0.8, contextWindow: 5 },
      { pattern: /\b(harass|harassment)\b/i, weight: 0.8, contextWindow: 5 },
      { pattern: /\b(spam|scam)\b/i, weight: 0.5, contextWindow: 3 },
      { pattern: /\b(fake|fraud)\b/i, weight: 0.4, contextWindow: 3 },
    ];
  }

  /**
   * Readability via Flesch-Kincaid formula
   * FK = 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
   * Score range: 0-100 (higher = more readable)
   */
  computeReadability(text: string): { score: number; metadata: QualityMetadata } {
    const sentences = this.countSentences(text);
    const words = this.countWords(text);
    const syllables = this.countSyllables(text);

    if (words === 0 || sentences === 0) {
      return {
        score: 0,
        metadata: {
          wordCount: 0,
          sentenceCount: 0,
          syllableCount: 0,
          uniqueTerms: 0,
          avgSentenceLength: 0,
        },
      };
    }

    const wordsPerSentence = words / sentences;
    const syllablesPerWord = syllables / words;

    // Flesch-Kincaid readability formula
    const fkScore = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

    // Clamp to 0-100 range and normalize to 0-1
    const normalizedScore = Math.max(0, Math.min(100, fkScore)) / 100;

    const uniqueTerms = new Set(
      text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0),
    ).size;

    return {
      score: normalizedScore,
      metadata: {
        wordCount: words,
        sentenceCount: sentences,
        syllableCount: syllables,
        uniqueTerms,
        avgSentenceLength: wordsPerSentence,
      },
    };
  }

  /** Count sentences in text */
  private countSentences(text: string): number {
    const sentenceEnders = text.match(/[.!?]+/g);
    return sentenceEnders ? sentenceEnders.length : 1;
  }

  /** Count words in text */
  private countWords(text: string): number {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    return words.length;
  }

  /** Count syllables in text (English approximation) */
  private countSyllables(text: string): number {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    let totalSyllables = 0;

    for (const word of words) {
      totalSyllables += this.countWordSyllables(word);
    }

    return totalSyllables;
  }

  /** Count syllables in a single word */
  private countWordSyllables(word: string): number {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned.length <= 3) return 1;

    // Count vowel groups
    const vowelGroups = cleaned.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;

    // Subtract silent e at end
    if (cleaned.endsWith('e') && !cleaned.endsWith('le')) {
      count = Math.max(1, count - 1);
    }

    // Words ending in -ed (usually silent)
    if (cleaned.endsWith('ed') && cleaned.length > 3) {
      count = Math.max(1, count - 1);
    }

    return Math.max(1, count);
  }

  /**
   * Originality scoring using MinHash
   * Generates k hash functions and approximates Jaccard similarity from signature agreement
   */
  computeOriginality(contentId: string, text: string): number {
    const signature = this.computeMinHashSignature(text);
    this.documentSignatures.set(contentId, signature);

    // Compare against all stored signatures
    let maxSimilarity = 0;

    for (const [existingId, existingSignature] of this.documentSignatures) {
      if (existingId === contentId) continue;

      // Jaccard approximation from MinHash: proportion of matching hash values
      let matches = 0;
      for (let i = 0; i < signature.length; i++) {
        if (signature[i] === existingSignature[i]) {
          matches++;
        }
      }
      const similarity = matches / signature.length;
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    // Originality = 1 - max similarity to existing content
    return 1 - maxSimilarity;
  }

  /** Compute MinHash signature for a text document */
  private computeMinHashSignature(text: string): number[] {
    const shingles = this.generateShingles(text);
    const signature = new Array(this.minHashConfig.numHashFunctions).fill(Infinity);
    const prime = 2147483647;

    for (const shingle of shingles) {
      const shingleHash = this.hashString(shingle);

      for (let i = 0; i < this.hashCoefficients.length; i++) {
        const coeff = this.hashCoefficients[i]!;
        // h(x) = (a*x + b) mod p
        const hashValue = (((coeff.a * shingleHash + coeff.b) % prime) + prime) % prime;
        if (hashValue < (signature[i] ?? Infinity)) {
          signature[i] = hashValue;
        }
      }
    }

    return signature;
  }

  /** Generate character n-gram shingles */
  private generateShingles(text: string): Set<string> {
    const shingles = new Set<string>();
    const normalized = text.toLowerCase().replace(/\s+/g, ' ');
    const n = this.minHashConfig.shingleSize;

    for (let i = 0; i <= normalized.length - n; i++) {
      shingles.add(normalized.substring(i, i + n));
    }

    return shingles;
  }

  /** Simple string hash function */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
  }

  /**
   * Engagement prediction using historical feature correlations
   * Predicts engagement score based on content features correlated with past engagement
   */
  computeEngagementPrediction(text: string): number {
    if (this.engagementCorrelations.length === 0) {
      // Default heuristic based on content properties
      const words = this.countWords(text);

      // Heuristic: optimal length engagement
      let lengthScore = 0;
      if (words >= 50 && words <= 500) {
        lengthScore = 1 - Math.abs(words - 200) / 300;
      } else if (words > 500) {
        lengthScore = 0.5;
      } else {
        lengthScore = (words / 50) * 0.5;
      }

      // Question marks and calls to action boost engagement
      const questionMarks = (text.match(/\?/g) || []).length;
      const questionBoost = Math.min(0.2, questionMarks * 0.05);

      // Paragraph variety
      const paragraphs = text.split(/\n\n+/).length;
      const structureScore = Math.min(1, paragraphs / 5) * 0.3;

      return Math.min(1.0, lengthScore * 0.5 + questionBoost + structureScore + 0.2);
    }

    // Use learned correlations
    let predictedEngagement = 0;
    const features = this.extractFeatures(text);

    for (const correlation of this.engagementCorrelations) {
      const featureValue = features.get(correlation.featureName) ?? 0;
      predictedEngagement += featureValue * correlation.coefficient;
    }

    return Math.max(0, Math.min(1, predictedEngagement));
  }

  /** Train engagement correlations from historical data */
  trainEngagementModel(samples: Array<{ text: string; engagement: number }>): void {
    if (samples.length < 5) return;

    const featureNames = [
      'word_count',
      'sentence_count',
      'avg_sentence_len',
      'unique_ratio',
      'question_count',
    ];
    const correlations: EngagementCorrelation[] = [];

    for (const featureName of featureNames) {
      const featureValues: number[] = [];
      const engagementValues: number[] = [];

      for (const sample of samples) {
        const features = this.extractFeatures(sample.text);
        featureValues.push(features.get(featureName) ?? 0);
        engagementValues.push(sample.engagement);
      }

      // Pearson correlation
      const n = featureValues.length;
      const meanX = featureValues.reduce((s, v) => s + v, 0) / n;
      const meanY = engagementValues.reduce((s, v) => s + v, 0) / n;

      let numerator = 0;
      let denomX = 0;
      let denomY = 0;

      for (let i = 0; i < n; i++) {
        const dx = (featureValues[i] ?? 0) - meanX;
        const dy = (engagementValues[i] ?? 0) - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
      }

      const denom = Math.sqrt(denomX * denomY);
      const coefficient = denom > 0 ? numerator / denom : 0;

      correlations.push({ featureName, coefficient, sampleSize: n });
    }

    this.engagementCorrelations = correlations;
  }

  /** Extract numerical features from text */
  private extractFeatures(text: string): Map<string, number> {
    const features = new Map<string, number>();
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    const uniqueWords = new Set(
      text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0),
    ).size;

    features.set('word_count', words / 1000); // Normalize
    features.set('sentence_count', sentences / 50);
    features.set('avg_sentence_len', words > 0 && sentences > 0 ? words / sentences / 30 : 0);
    features.set('unique_ratio', words > 0 ? uniqueWords / words : 0);
    features.set('question_count', (text.match(/\?/g) || []).length / 10);

    return features;
  }

  /**
   * Toxicity estimation using keyword patterns + context windows
   * Analyzes surrounding context to reduce false positives
   */
  computeToxicity(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let totalToxicity = 0;
    let matchCount = 0;

    for (const { pattern, weight, contextWindow } of this.toxicPatterns) {
      const matches = text.match(new RegExp(pattern, 'gi'));
      if (!matches) continue;

      for (const _match of matches) {
        // Find position of match
        const matchIndex = words.findIndex((w) => pattern.test(w));
        if (matchIndex === -1) continue;

        // Analyze context window for negation or quoting
        const contextStart = Math.max(0, matchIndex - contextWindow);
        const contextEnd = Math.min(words.length, matchIndex + contextWindow + 1);
        const context = words.slice(contextStart, contextEnd).join(' ');

        // Reduce weight if context suggests negation or quotation
        let adjustedWeight = weight;
        if (/\b(not|no|never|don't|doesn't|isn't|against|anti|prevent)\b/i.test(context)) {
          adjustedWeight *= 0.3; // Negation context
        }
        if (/["']/.test(context)) {
          adjustedWeight *= 0.5; // Quoted context
        }

        totalToxicity += adjustedWeight;
        matchCount++;
      }
    }

    // Normalize by text length to avoid penalizing longer content
    const wordCount = words.length;
    const normalizedToxicity = wordCount > 0 ? totalToxicity / Math.sqrt(wordCount) : 0;

    return Math.min(1.0, normalizedToxicity);
  }

  /**
   * Information density: unique concepts / total words ratio
   * Higher density indicates more informative content
   */
  computeInformationDensity(text: string): number {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (words.length === 0) return 0;

    // Filter out stop words and short words to get "concepts"
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'shall',
      'can',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'and',
      'but',
      'or',
      'not',
      'no',
      'nor',
      'so',
      'yet',
      'both',
      'either',
      'neither',
      'each',
      'every',
      'all',
      'any',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'than',
      'too',
      'very',
      'just',
      'also',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
      'he',
      'she',
      'they',
      'them',
      'their',
      'we',
      'us',
      'our',
    ]);

    const concepts = words.filter((w) => w.length > 3 && !stopWords.has(w));
    const uniqueConcepts = new Set(concepts);

    if (words.length === 0) return 0;

    // Information density = unique concepts / total words
    return uniqueConcepts.size / words.length;
  }

  /**
   * Compute overall composite quality score
   * Combines all quality dimensions with configurable weights
   */
  scoreContent(contentId: string, text: string): QualityScore {
    const { score: readabilityScore, metadata } = this.computeReadability(text);
    const originalityScore = this.computeOriginality(contentId, text);
    const engagementPotential = this.computeEngagementPrediction(text);
    const toxicityScore = this.computeToxicity(text);
    const informationDensity = this.computeInformationDensity(text);

    // Composite score with toxicity as a penalty
    const overallScore =
      readabilityScore * 0.2 +
      originalityScore * 0.25 +
      engagementPotential * 0.2 +
      (1 - toxicityScore) * 0.2 +
      informationDensity * 0.15;

    const dimensions: Record<ContentQualityDimension, number> = {
      readability: readabilityScore,
      originality: originalityScore,
      engagement_potential: engagementPotential,
      toxicity: toxicityScore,
      information_density: informationDensity,
    };

    return {
      contentId,
      overallScore: Math.max(0, Math.min(1, overallScore)),
      dimensions,
      timestamp: Date.now(),
      metadata,
    };
  }

  /** Check if content passes quality thresholds */
  passesQualityCheck(score: QualityScore): boolean {
    if (score.overallScore < this.thresholds.overallPassThreshold) return false;
    if (score.dimensions.readability < this.thresholds.minReadability / 100) return false;
    if (score.dimensions.originality < this.thresholds.minOriginality) return false;
    if (score.dimensions.toxicity > this.thresholds.maxToxicity) return false;
    if (score.dimensions.information_density < this.thresholds.minInformationDensity) return false;
    return true;
  }

  /** Get quality thresholds */
  getThresholds(): QualityThresholds {
    return { ...this.thresholds };
  }

  /** Update quality thresholds */
  updateThresholds(thresholds: Partial<QualityThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}
