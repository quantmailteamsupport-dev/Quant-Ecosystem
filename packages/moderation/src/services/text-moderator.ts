// ============================================================================
// Moderation - Text Moderator
// Text content moderation with profanity detection, spam scoring, toxicity
// ============================================================================

import type {
  ContentCategory,
  ModerationAction,
  ModerationResult,
  CategoryScore,
} from '../types';

interface TextModeratorConfig {
  profanityThreshold: number;
  toxicityThreshold: number;
  spamThreshold: number;
  maxTextLength: number;
  enableMasking: boolean;
  maskCharacter: string;
}

const DEFAULT_CONFIG: TextModeratorConfig = {
  profanityThreshold: 0.6,
  toxicityThreshold: 0.7,
  spamThreshold: 0.65,
  maxTextLength: 50000,
  enableMasking: true,
  maskCharacter: '*',
};

/** Profanity patterns (placeholder representations) */
const PROFANITY_PATTERNS: { pattern: RegExp; severity: number }[] = [
  { pattern: /\b(profanity_severe_1|profanity_severe_2|profanity_severe_3)\b/gi, severity: 0.9 },
  { pattern: /\b(profanity_moderate_1|profanity_moderate_2|profanity_moderate_3)\b/gi, severity: 0.6 },
  { pattern: /\b(profanity_mild_1|profanity_mild_2|damn|hell|crap)\b/gi, severity: 0.3 },
  { pattern: /[!@#$%]{3,}/g, severity: 0.2 },
];

/** Spam indicators with Bayesian weights */
const SPAM_INDICATORS: { pattern: RegExp; weight: number }[] = [
  { pattern: /\b(buy now|act fast|limited time|exclusive deal)\b/gi, weight: 0.8 },
  { pattern: /\b(click here|visit now|free gift|no obligation)\b/gi, weight: 0.7 },
  { pattern: /\b(winner|congratulations|selected|lucky)\b/gi, weight: 0.5 },
  { pattern: /(https?:\/\/[^\s]+){3,}/g, weight: 0.6 },
  { pattern: /(.)\1{4,}/g, weight: 0.4 },
  { pattern: /[A-Z]{5,}/g, weight: 0.3 },
  { pattern: /[!?]{3,}/g, weight: 0.3 },
  { pattern: /\$\d+/g, weight: 0.4 },
  { pattern: /\b(subscribe|follow|like|share)\b.*\b(subscribe|follow|like|share)\b/gi, weight: 0.5 },
  { pattern: /(.{10,})\1{2,}/g, weight: 0.7 },
];

/** Hate speech patterns */
const HATE_PATTERNS: { pattern: RegExp; weight: number; target: string }[] = [
  { pattern: /\b(hate_group_placeholder|supremac)/gi, weight: 0.9, target: 'group' },
  { pattern: /\b(go back to|deport all|ban all)\b/gi, weight: 0.7, target: 'ethnicity' },
  { pattern: /\b(inferior|subhuman|vermin|animal)\b.*\b(people|race|group)\b/gi, weight: 0.85, target: 'dehumanization' },
];

interface Violation {
  type: ContentCategory;
  severity: number;
  evidence: string;
  position: { start: number; end: number };
}

/**
 * TextModerator - Advanced text content moderation
 *
 * Provides profanity detection, toxicity scoring, hate speech detection,
 * spam classification, and content filtering with masking capabilities.
 * Uses regex-based pattern matching with Bayesian spam scoring.
 */
export class TextModerator {
  private config: TextModeratorConfig;
  private customBlocklist: Set<string>;
  private allowlist: Set<string>;
  private moderationCache: Map<string, ModerationResult>;
  private spamCorpus: Map<string, { spam: number; ham: number }>;

  constructor(config: Partial<TextModeratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.customBlocklist = new Set();
    this.allowlist = new Set();
    this.moderationCache = new Map();
    this.spamCorpus = new Map();
    this.initializeSpamCorpus();
  }

  /** Moderate text content - full analysis */
  async moderate(text: string, contentId?: string): Promise<ModerationResult> {
    if (text.length > this.config.maxTextLength) {
      text = text.substring(0, this.config.maxTextLength);
    }

    const profanityScore = this.checkProfanity(text);
    const toxicityScore = this.scoreToxicity(text);
    const spamScore = this.detectSpam(text);
    const hateScore = this.detectHateSpeech(text);

    const categories: CategoryScore[] = [
      { category: 'profanity', score: profanityScore, confidence: 0.85, detected: profanityScore >= this.config.profanityThreshold },
      { category: 'spam', score: spamScore.score, confidence: spamScore.confidence, detected: spamScore.score >= this.config.spamThreshold },
      { category: 'hate_speech', score: hateScore.score, confidence: hateScore.confidence, detected: hateScore.score >= 0.6 },
      { category: 'harassment', score: toxicityScore * 0.8, confidence: 0.7, detected: toxicityScore >= this.config.toxicityThreshold },
      { category: 'violence', score: this.detectViolentContent(text), confidence: 0.75, detected: false },
      { category: 'self_harm', score: this.detectSelfHarm(text), confidence: 0.8, detected: false },
    ];

    // Update detected flags
    categories[4].detected = categories[4].score >= 0.6;
    categories[5].detected = categories[5].score >= 0.5;

    const overallScore = Math.max(...categories.map(c => c.score));
    const action = this.determineAction(categories);

    const result: ModerationResult = {
      id: `txtmod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId: contentId || `content_${Date.now()}`,
      contentType: 'text',
      categories,
      overallScore,
      action,
      confidence: categories.reduce((sum, c) => sum + c.confidence, 0) / categories.length,
      automated: true,
      flags: categories.filter(c => c.detected).map(c => c.category),
      metadata: { textLength: text.length, wordCount: text.split(/\s+/).length },
      createdAt: Date.now(),
    };

    if (contentId) this.moderationCache.set(contentId, result);
    return result;
  }

  /** Check profanity level in text */
  checkProfanity(text: string): number {
    let maxSeverity = 0;
    let matchCount = 0;

    // Check custom blocklist
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (this.customBlocklist.has(word) && !this.allowlist.has(word)) {
        maxSeverity = Math.max(maxSeverity, 0.8);
        matchCount++;
      }
    }

    // Check patterns
    for (const { pattern, severity } of PROFANITY_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        maxSeverity = Math.max(maxSeverity, severity);
        matchCount += matches.length;
      }
    }

    // Score based on density and severity
    const density = matchCount / Math.max(1, words.length);
    return Math.min(1, maxSeverity * 0.7 + density * 10 * 0.3);
  }

  /** Score text toxicity (0-1) */
  scoreToxicity(text: string): number {
    const indicators = [
      { pattern: /\b(idiot|moron|stupid|dumb|loser|pathetic)\b/gi, weight: 0.4 },
      { pattern: /\b(die|kill yourself|kys|end yourself)\b/gi, weight: 0.95 },
      { pattern: /\b(shut up|nobody cares|go away|get lost)\b/gi, weight: 0.3 },
      { pattern: /\b(ugly|fat|disgusting|revolting|hideous)\b/gi, weight: 0.5 },
      { pattern: /\b(hate you|despise|detest|loathe)\b/gi, weight: 0.6 },
      { pattern: /\b(threat_placeholder|hurt you|find you)\b/gi, weight: 0.85 },
    ];

    let totalScore = 0;
    let matchCount = 0;

    for (const { pattern, weight } of indicators) {
      const matches = text.match(pattern);
      if (matches) {
        totalScore += weight * Math.min(matches.length, 3);
        matchCount += matches.length;
      }
    }

    // Check for ALL CAPS aggression
    const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(1, text.length);
    if (capsRatio > 0.7 && text.length > 20) totalScore += 0.2;

    // Check exclamation density
    const exclamationDensity = (text.match(/!/g) || []).length / Math.max(1, text.split(/\s+/).length);
    if (exclamationDensity > 0.5) totalScore += 0.1;

    return Math.min(1, totalScore / Math.max(1, matchCount * 0.5 + 1));
  }

  /** Detect hate speech with confidence */
  detectHateSpeech(text: string): { score: number; confidence: number; targets: string[] } {
    let maxScore = 0;
    const targets: string[] = [];

    for (const { pattern, weight, target } of HATE_PATTERNS) {
      if (pattern.test(text)) {
        maxScore = Math.max(maxScore, weight);
        if (!targets.includes(target)) targets.push(target);
      }
    }

    return {
      score: maxScore,
      confidence: maxScore > 0 ? 0.75 : 0.95,
      targets,
    };
  }

  /** Detect spam using Bayesian scoring */
  detectSpam(text: string): { score: number; confidence: number; indicators: string[] } {
    let totalWeight = 0;
    let matchedWeight = 0;
    const indicators: string[] = [];

    for (const { pattern, weight } of SPAM_INDICATORS) {
      totalWeight += weight;
      if (pattern.test(text)) {
        matchedWeight += weight;
        indicators.push(pattern.source.substring(0, 30));
      }
    }

    // Bayesian word probability
    const words = text.toLowerCase().split(/\s+/);
    let bayesScore = 0;
    let wordCount = 0;
    for (const word of words) {
      const data = this.spamCorpus.get(word);
      if (data) {
        const spamProb = data.spam / (data.spam + data.ham + 1);
        bayesScore += spamProb;
        wordCount++;
      }
    }
    const avgBayesScore = wordCount > 0 ? bayesScore / wordCount : 0;

    // Link density check
    const linkCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
    const linkDensity = linkCount / Math.max(1, words.length);
    const linkBoost = linkDensity > 0.3 ? 0.3 : linkDensity;

    const finalScore = Math.min(1,
      (matchedWeight / Math.max(1, totalWeight)) * 0.5 +
      avgBayesScore * 0.3 +
      linkBoost * 0.2
    );

    return {
      score: finalScore,
      confidence: Math.min(0.95, 0.5 + indicators.length * 0.1),
      indicators,
    };
  }

  /** Filter and mask profanity in text */
  filterContent(text: string): string {
    let filtered = text;

    for (const { pattern } of PROFANITY_PATTERNS) {
      filtered = filtered.replace(pattern, (match) => {
        return this.config.maskCharacter.repeat(match.length);
      });
    }

    for (const word of this.customBlocklist) {
      if (this.allowlist.has(word)) continue;
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      filtered = filtered.replace(regex, this.config.maskCharacter.repeat(word.length));
    }

    return filtered;
  }

  /** Mask profanity keeping first and last characters */
  maskProfanity(text: string): string {
    let masked = text;
    for (const { pattern } of PROFANITY_PATTERNS) {
      masked = masked.replace(pattern, (match) => {
        if (match.length <= 2) return this.config.maskCharacter.repeat(match.length);
        return match[0] + this.config.maskCharacter.repeat(match.length - 2) + match[match.length - 1];
      });
    }
    return masked;
  }

  /** Get all violations found in text */
  getViolations(text: string): Violation[] {
    const violations: Violation[] = [];

    for (const { pattern, severity } of PROFANITY_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        violations.push({
          type: 'profanity',
          severity,
          evidence: match[0],
          position: { start: match.index, end: match.index + match[0].length },
        });
      }
    }

    return violations.sort((a, b) => b.severity - a.severity);
  }

  /** Add words to custom blocklist */
  addToBlocklist(words: string[]): void {
    for (const word of words) {
      this.customBlocklist.add(word.toLowerCase());
    }
  }

  /** Add words to allowlist (override blocklist) */
  addToAllowlist(words: string[]): void {
    for (const word of words) {
      this.allowlist.add(word.toLowerCase());
    }
  }

  // --- Private Methods ---

  private detectViolentContent(text: string): number {
    const patterns = [
      { pattern: /\b(kill|murder|stab|shoot|attack|assault)\b/gi, weight: 0.7 },
      { pattern: /\b(blood|gore|dismember|torture|mutilate)\b/gi, weight: 0.8 },
      { pattern: /\b(bomb|explode|detonate|destroy)\b/gi, weight: 0.6 },
    ];
    let score = 0;
    for (const { pattern, weight } of patterns) {
      if (pattern.test(text)) score = Math.max(score, weight);
    }
    return score;
  }

  private detectSelfHarm(text: string): number {
    const patterns = [
      { pattern: /\b(suicide|kill myself|end my life|no reason to live)\b/gi, weight: 0.95 },
      { pattern: /\b(self.?harm|cut myself|hurt myself)\b/gi, weight: 0.85 },
      { pattern: /\b(want to die|better off dead|can't go on)\b/gi, weight: 0.8 },
    ];
    let score = 0;
    for (const { pattern, weight } of patterns) {
      if (pattern.test(text)) score = Math.max(score, weight);
    }
    return score;
  }

  private determineAction(categories: CategoryScore[]): ModerationAction {
    const detected = categories.filter(c => c.detected);
    if (detected.length === 0) return 'approve';
    const maxScore = Math.max(...detected.map(c => c.score));
    if (maxScore >= 0.9) return 'remove';
    if (maxScore >= 0.7) return 'flag';
    if (maxScore >= 0.5) return 'restrict';
    return 'warn';
  }

  private initializeSpamCorpus(): void {
    const spamWords = ['buy', 'free', 'winner', 'cash', 'prize', 'urgent', 'offer', 'deal', 'discount', 'limited'];
    const hamWords = ['hello', 'thanks', 'please', 'help', 'question', 'update', 'meeting', 'project', 'team', 'review'];
    for (const w of spamWords) this.spamCorpus.set(w, { spam: 8, ham: 2 });
    for (const w of hamWords) this.spamCorpus.set(w, { spam: 1, ham: 9 });
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
