// ============================================================================
// QuantSync - AI Service
// AI content suggestions, fact-checking, content moderation, trending analysis
// ============================================================================

import type { AIContentSuggestion, FactCheck, Post, TrendingTopic } from '../../src/types';

interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 to 1
  aspects: { aspect: string; sentiment: string; score: number }[];
}

interface ContentClassification {
  categories: { label: string; confidence: number }[];
  topics: string[];
  language: string;
  readabilityScore: number;
}

class AIService {
  private factCheckCache: Map<string, FactCheck> = new Map();
  private contentClassificationCache: Map<string, ContentClassification> = new Map();

  // --------------------------------------------------------------------------
  // Content Suggestions
  // --------------------------------------------------------------------------

  generateCaptionSuggestions(context: { topic?: string; mood?: string; media?: string[] }): AIContentSuggestion[] {
    const suggestions: AIContentSuggestion[] = [];
    const topic = context.topic || 'general';
    const mood = context.mood || 'neutral';

    const templates: Record<string, string[]> = {
      technology: [
        'Breaking: Major advances in ${topic} are reshaping the industry',
        'Hot take: The future of ${topic} is not what you think',
        'Thread: Everything you need to know about the latest ${topic} developments',
      ],
      general: [
        'Thoughts on this? Let me know what you think below',
        'Unpopular opinion thread incoming...',
        'Something I have been thinking about lately:',
      ],
      gaming: [
        'Just played this for 12 hours straight. No regrets.',
        'The gaming community needs to talk about this more.',
        'Rate my setup / hot takes on the latest release',
      ],
      news: [
        'Developing story: Here is what we know so far',
        'Analysis: What this means for the broader landscape',
        'Key takeaways from today is announcement',
      ],
    };

    const pool = templates[topic] || templates['general'];
    for (let i = 0; i < Math.min(3, pool.length); i++) {
      suggestions.push({
        id: `suggestion_${Date.now()}_${i}`,
        type: 'caption',
        content: pool[i].replace('${topic}', topic),
        confidence: 0.7 + Math.random() * 0.2,
        context: `Based on ${topic} topic with ${mood} mood`,
      });
    }

    return suggestions;
  }

  generateHashtagSuggestions(content: string): AIContentSuggestion[] {
    const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hashtags: string[] = [];

    // Extract potential hashtags from content
    const significantWords = words
      .filter(w => !['this', 'that', 'with', 'from', 'have', 'been', 'what', 'just', 'about'].includes(w))
      .slice(0, 5);

    for (const word of significantWords) {
      hashtags.push(`#${word}`);
    }

    // Add trending-related hashtags
    hashtags.push('#trending', '#viral');

    return hashtags.slice(0, 5).map((tag, i) => ({
      id: `hashtag_${Date.now()}_${i}`,
      type: 'hashtag' as const,
      content: tag,
      confidence: 0.8 - i * 0.1,
      context: 'Generated from content analysis',
    }));
  }

  generateReplySuggestions(postContent: string, context?: string): AIContentSuggestion[] {
    const sentiment = this.analyzeSentiment(postContent);
    const suggestions: AIContentSuggestion[] = [];

    if (sentiment.overall === 'positive') {
      suggestions.push(
        { id: `reply_${Date.now()}_0`, type: 'reply', content: 'This is great! Thanks for sharing.', confidence: 0.8, context: 'positive response' },
        { id: `reply_${Date.now()}_1`, type: 'reply', content: 'Absolutely agree with this take!', confidence: 0.75, context: 'agreement' },
        { id: `reply_${Date.now()}_2`, type: 'reply', content: 'Well said. Adding to bookmarks.', confidence: 0.7, context: 'appreciation' },
      );
    } else if (sentiment.overall === 'negative') {
      suggestions.push(
        { id: `reply_${Date.now()}_0`, type: 'reply', content: 'I see your point, but have you considered...', confidence: 0.75, context: 'constructive disagreement' },
        { id: `reply_${Date.now()}_1`, type: 'reply', content: 'Respectfully, I think there is another perspective here.', confidence: 0.7, context: 'alternative view' },
      );
    } else {
      suggestions.push(
        { id: `reply_${Date.now()}_0`, type: 'reply', content: 'Interesting perspective! Can you elaborate?', confidence: 0.8, context: 'curiosity' },
        { id: `reply_${Date.now()}_1`, type: 'reply', content: 'Thanks for sharing this. Thoughts?', confidence: 0.7, context: 'engagement' },
      );
    }

    return suggestions;
  }

  generatePostIdeas(userId: string, interests: string[]): AIContentSuggestion[] {
    const ideas: string[] = [
      `Share your hot take on the latest ${interests[0] || 'tech'} news`,
      'Create a thread explaining something complex in simple terms',
      `Post a poll about ${interests[1] || 'current events'} to engage your followers`,
      'Share a personal story or lesson learned recently',
      'Start a discussion about an underrated topic in your field',
    ];

    return ideas.map((idea, i) => ({
      id: `idea_${Date.now()}_${i}`,
      type: 'post_idea' as const,
      content: idea,
      confidence: 0.6 + Math.random() * 0.2,
      context: `Based on interests: ${interests.join(', ')}`,
    }));
  }

  // --------------------------------------------------------------------------
  // Fact Checking
  // --------------------------------------------------------------------------

  async factCheck(postId: string, content: string): Promise<FactCheck> {
    const cached = this.factCheckCache.get(postId);
    if (cached) return cached;

    // Simulate fact-checking analysis
    const claims = this.extractClaims(content);
    if (claims.length === 0) {
      const result: FactCheck = {
        id: `fc_${Date.now()}`,
        postId,
        claim: content.substring(0, 100),
        verdict: 'unverifiable',
        explanation: 'No verifiable factual claims detected in this content.',
        sources: [],
        confidence: 0.9,
        checkedAt: new Date().toISOString(),
      };
      this.factCheckCache.set(postId, result);
      return result;
    }

    // Analyze the primary claim
    const primaryClaim = claims[0];
    const verdict = this.assessClaim(primaryClaim);

    const result: FactCheck = {
      id: `fc_${Date.now()}`,
      postId,
      claim: primaryClaim,
      verdict: verdict.verdict,
      explanation: verdict.explanation,
      sources: verdict.sources,
      confidence: verdict.confidence,
      checkedAt: new Date().toISOString(),
    };

    this.factCheckCache.set(postId, result);
    return result;
  }

  private extractClaims(content: string): string[] {
    // Simple claim extraction based on patterns
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.filter(s => {
      const lower = s.toLowerCase();
      return (
        lower.includes('study') || lower.includes('research') ||
        lower.includes('percent') || lower.includes('%') ||
        lower.includes('according to') || lower.includes('fact') ||
        lower.includes('proven') || lower.includes('statistic')
      );
    }).map(s => s.trim());
  }

  private assessClaim(claim: string): { verdict: FactCheck['verdict']; explanation: string; sources: string[]; confidence: number } {
    // Simulated assessment based on content patterns
    const hasNumbers = /\d+/.test(claim);
    const hasSource = /according to|study|research/i.test(claim);

    if (hasSource && hasNumbers) {
      return {
        verdict: 'mostly_true',
        explanation: 'This claim references data and sources. While the general direction appears accurate, specific numbers may vary by source.',
        sources: ['Academic databases', 'Verified news sources'],
        confidence: 0.6,
      };
    }

    if (hasNumbers && !hasSource) {
      return {
        verdict: 'mixed',
        explanation: 'This claim contains specific numbers but lacks attribution. The figures may be outdated or taken out of context.',
        sources: [],
        confidence: 0.5,
      };
    }

    return {
      verdict: 'unverifiable',
      explanation: 'This claim is opinion-based or lacks sufficient specificity for fact-checking.',
      sources: [],
      confidence: 0.7,
    };
  }

  // --------------------------------------------------------------------------
  // Sentiment Analysis
  // --------------------------------------------------------------------------

  analyzeSentiment(content: string): SentimentAnalysis {
    const positiveWords = ['great', 'awesome', 'love', 'amazing', 'excellent', 'happy', 'good', 'best', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'worst', 'horrible', 'disgusting', 'pathetic', 'failure', 'disappointed'];

    const words = content.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    let score = 0;
    let overall: SentimentAnalysis['overall'] = 'neutral';

    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
      if (score > 0.3) overall = 'positive';
      else if (score < -0.3) overall = 'negative';
      else if (positiveCount > 0 && negativeCount > 0) overall = 'mixed';
    }

    return { overall, score, aspects: [] };
  }

  // --------------------------------------------------------------------------
  // Content Classification
  // --------------------------------------------------------------------------

  classifyContent(content: string): ContentClassification {
    const cacheKey = content.substring(0, 100);
    const cached = this.contentClassificationCache.get(cacheKey);
    if (cached) return cached;

    const categories: { label: string; confidence: number }[] = [];
    const lower = content.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
      technology: ['ai', 'software', 'code', 'tech', 'computer', 'algorithm', 'data', 'app'],
      politics: ['government', 'election', 'policy', 'vote', 'democrat', 'republican', 'law'],
      sports: ['game', 'team', 'player', 'score', 'match', 'championship', 'league'],
      entertainment: ['movie', 'show', 'music', 'album', 'series', 'actor', 'celebrity'],
      science: ['research', 'study', 'experiment', 'discovery', 'physics', 'biology'],
      finance: ['market', 'stock', 'crypto', 'investment', 'economy', 'trading'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matchCount = keywords.filter(k => lower.includes(k)).length;
      if (matchCount > 0) {
        categories.push({ label: category, confidence: Math.min(matchCount * 0.25, 0.95) });
      }
    }

    if (categories.length === 0) {
      categories.push({ label: 'general', confidence: 0.5 });
    }

    categories.sort((a, b) => b.confidence - a.confidence);
    const topics = categories.slice(0, 3).map(c => c.label);

    const result: ContentClassification = {
      categories,
      topics,
      language: 'en',
      readabilityScore: this.calculateReadability(content),
    };

    this.contentClassificationCache.set(cacheKey, result);
    return result;
  }

  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, w) => sum + this.countSyllables(w), 0);

    if (sentences.length === 0 || words.length === 0) return 50;

    // Flesch reading ease approximation
    const avgSentenceLen = words.length / sentences.length;
    const avgSyllables = syllables / words.length;
    const score = 206.835 - 1.015 * avgSentenceLen - 84.6 * avgSyllables;

    return Math.max(0, Math.min(100, score));
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    const vowelGroups = word.match(/[aeiouy]+/g);
    return vowelGroups ? vowelGroups.length : 1;
  }

  // --------------------------------------------------------------------------
  // Trending Analysis
  // --------------------------------------------------------------------------

  analyzeTrendingPattern(topic: string, postHistory: Post[]): {
    velocity: number;
    predicted_peak: string;
    sentiment: string;
    category: string;
  } {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const twoHoursAgo = now - 7200000;

    const recentPosts = postHistory.filter(p => new Date(p.createdAt).getTime() > hourAgo);
    const olderPosts = postHistory.filter(p => {
      const t = new Date(p.createdAt).getTime();
      return t > twoHoursAgo && t <= hourAgo;
    });

    const velocity = olderPosts.length > 0 ? recentPosts.length / olderPosts.length : recentPosts.length;
    const avgSentiment = recentPosts.reduce((sum, p) => {
      const s = this.analyzeSentiment(p.content);
      return sum + s.score;
    }, 0) / (recentPosts.length || 1);

    return {
      velocity,
      predicted_peak: new Date(now + (velocity > 2 ? 3600000 : 7200000)).toISOString(),
      sentiment: avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral',
      category: this.classifyContent(topic).topics[0] || 'general',
    };
  }
}

export const aiService = new AIService();
export default AIService;
