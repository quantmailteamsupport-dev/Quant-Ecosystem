// ============================================================================
// QuantMax - Dating AI Service
// Icebreakers, compatibility analysis, conversation coaching, red flag detection
// ============================================================================

interface IcebreakerSuggestion {
  id: string;
  text: string;
  category: 'witty' | 'thoughtful' | 'playful' | 'direct' | 'creative';
  relevance: number;
  basedOn: string;
  tone: string;
}

interface CompatibilityResult {
  user1Id: string;
  user2Id: string;
  overallScore: number;
  dimensions: CompatibilityDimension[];
  strengths: string[];
  challenges: string[];
  recommendation: string;
}

interface CompatibilityDimension {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface ConversationCoach {
  messageId: string;
  suggestions: string[];
  tone: 'friendly' | 'flirty' | 'casual' | 'deep';
  avoid: string[];
  tipOfTheDay: string;
}

interface RedFlagResult {
  hasRedFlags: boolean;
  flags: { type: string; severity: 'low' | 'medium' | 'high'; evidence: string; recommendation: string }[];
  overallRisk: 'safe' | 'caution' | 'warning' | 'danger';
  safetyTips: string[];
}

interface DateSuggestion {
  id: string;
  type: 'activity' | 'restaurant' | 'outdoor' | 'cultural' | 'adventure';
  title: string;
  description: string;
  estimatedCost: string;
  duration: string;
  compatibility: number;
  considerations: string[];
}

interface UserProfile {
  id: string;
  interests: string[];
  personality: string[];
  communication_style: string;
  values: string[];
  dealbreakers: string[];
  love_language: string;
}

class DatingAIService {
  private profiles: Map<string, UserProfile> = new Map();
  private conversationHistory: Map<string, string[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async suggestIcebreaker(matchContext: { userId: string; matchProfile: UserProfile; sharedInterests: string[] }): Promise<IcebreakerSuggestion[]> {
    const { matchProfile, sharedInterests } = matchContext;
    const categories: IcebreakerSuggestion['category'][] = ['witty', 'thoughtful', 'playful', 'direct', 'creative'];

    const templates: Record<string, string[]> = {
      witty: [
        `I noticed you like ${sharedInterests[0] || 'adventure'}. On a scale of 1-10, how spontaneous are you?`,
        `Your taste in ${sharedInterests[0] || 'music'} tells me you have good judgment. What else should I know?`,
        `Plot twist: we both love ${sharedInterests[0] || 'coffee'}. Coincidence or destiny?`,
      ],
      thoughtful: [
        `What got you interested in ${matchProfile.interests[0] || 'your hobbies'}? I'd love to hear the story.`,
        `I appreciate someone who values ${matchProfile.values[0] || 'authenticity'}. What does that mean to you?`,
        `Your profile gives off great energy. What's the best part of your week been?`,
      ],
      playful: [
        `Quick question: pineapple on pizza, yes or absolute chaos?`,
        `I have a theory about people who like ${sharedInterests[0] || 'travel'}. Want to hear it?`,
        `Let's skip the small talk. Favorite childhood cartoon, go!`,
      ],
      direct: [
        `Hi! I think we'd have a great conversation about ${sharedInterests[0] || 'life'}. Free this weekend?`,
        `Your vibe is exactly what I'm looking for. Tell me something surprising about yourself.`,
      ],
      creative: [
        `If we were characters in a movie, I think ours would be a ${matchProfile.interests.includes('comedy') ? 'rom-com' : 'drama'}. Thoughts?`,
        `I'm imagining our first hangout involves ${sharedInterests[0] || 'good food'} and great conversation. Am I close?`,
      ],
    };

    const suggestions: IcebreakerSuggestion[] = categories.map(cat => {
      const options = templates[cat] || templates.witty;
      const text = options[Math.floor(Math.random() * options.length)];
      return {
        id: this.genId('ice'),
        text,
        category: cat,
        relevance: 0.6 + Math.random() * 0.4,
        basedOn: sharedInterests[0] || matchProfile.interests[0] || 'general',
        tone: cat === 'direct' ? 'confident' : cat === 'playful' ? 'fun' : 'warm',
      };
    });

    return suggestions.sort((a, b) => b.relevance - a.relevance);
  }

  async analyzeCompatibility(user1: UserProfile, user2: UserProfile): Promise<CompatibilityResult> {
    const dimensions: CompatibilityDimension[] = [
      { name: 'Shared Interests', score: this.calculateOverlap(user1.interests, user2.interests), weight: 0.25, description: 'Common hobbies and activities' },
      { name: 'Values Alignment', score: this.calculateOverlap(user1.values, user2.values), weight: 0.3, description: 'Core values compatibility' },
      { name: 'Communication Style', score: user1.communication_style === user2.communication_style ? 0.9 : 0.5 + Math.random() * 0.3, weight: 0.2, description: 'How you express yourselves' },
      { name: 'Personality Match', score: this.calculatePersonalityMatch(user1.personality, user2.personality), weight: 0.15, description: 'Personality type compatibility' },
      { name: 'Love Language', score: user1.love_language === user2.love_language ? 0.95 : 0.4 + Math.random() * 0.4, weight: 0.1, description: 'How you give and receive love' },
    ];

    const overallScore = dimensions.reduce((s, d) => s + d.score * d.weight, 0);

    const strengths: string[] = dimensions.filter(d => d.score > 0.7).map(d => `Strong ${d.name.toLowerCase()}`);
    const challenges: string[] = dimensions.filter(d => d.score < 0.4).map(d => `${d.name} may need work`);

    const dealbreakersViolated = user1.dealbreakers.some(db => user2.interests.includes(db) || user2.values.includes(db));
    if (dealbreakersViolated) challenges.push('Potential dealbreaker conflict detected');

    const recommendation = overallScore > 0.8 ? 'Excellent match! Strong compatibility across multiple dimensions.' :
      overallScore > 0.6 ? 'Good potential. You have shared ground to build on.' :
      overallScore > 0.4 ? 'Some differences, but opposites can attract. Communication is key.' :
      'Significant differences. Consider if these complement or conflict.';

    return { user1Id: user1.id, user2Id: user2.id, overallScore: Math.round(overallScore * 100) / 100, dimensions, strengths, challenges, recommendation };
  }

  private calculateOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0.3;
    const set2 = new Set(arr2.map(s => s.toLowerCase()));
    const overlap = arr1.filter(item => set2.has(item.toLowerCase())).length;
    return overlap / Math.max(arr1.length, arr2.length);
  }

  private calculatePersonalityMatch(p1: string[], p2: string[]): number {
    const complementary = [['introvert', 'extrovert'], ['thinker', 'feeler'], ['planner', 'spontaneous']];
    let score = 0.5;
    for (const [a, b] of complementary) {
      if ((p1.includes(a) && p2.includes(b)) || (p1.includes(b) && p2.includes(a))) score += 0.1;
      if (p1.includes(a) && p2.includes(a)) score += 0.05;
    }
    return Math.min(1, score + Math.random() * 0.2);
  }

  async generateOpener(profile: UserProfile): Promise<{ opener: string; alternatives: string[] }> {
    const interest = profile.interests[Math.floor(Math.random() * profile.interests.length)] || 'life';
    const opener = `I see you're into ${interest}! What's your favorite thing about it?`;
    const alternatives = [
      `Your ${interest} interest caught my eye. Any recent discoveries?`,
      `Fellow ${interest} enthusiast here! Let's compare notes.`,
      `${interest}, huh? Tell me something about it I probably don't know.`,
    ];
    return { opener, alternatives };
  }

  async coachConversation(userId: string, lastMessages: string[]): Promise<ConversationCoach> {
    const avgLength = lastMessages.reduce((s, m) => s + m.length, 0) / (lastMessages.length || 1);
    const isAsking = lastMessages.some(m => m.includes('?'));

    const suggestions: string[] = [];
    if (avgLength < 20) suggestions.push('Try adding more detail to your responses to show genuine interest');
    if (!isAsking) suggestions.push('Ask an open-ended question to keep the conversation flowing');
    suggestions.push('Share a personal anecdote related to their last topic');
    suggestions.push('Use humor to lighten the mood if the conversation feels heavy');

    return {
      messageId: this.genId('coach'),
      suggestions,
      tone: avgLength > 50 ? 'deep' : 'casual',
      avoid: ['one-word responses', 'oversharing too early', 'being negative about exes'],
      tipOfTheDay: 'People love talking about their passions. Ask follow-up questions!',
    };
  }

  async detectRedFlags(messages: string[]): Promise<RedFlagResult> {
    const flags: RedFlagResult['flags'] = [];
    const redFlagPatterns = [
      { pattern: /send.*money|pay.*me|cash.*app/i, type: 'financial_request', severity: 'high' as const },
      { pattern: /meet.*alone|come.*to.*my/i, type: 'unsafe_meeting', severity: 'medium' as const },
      { pattern: /don't.*tell.*anyone|keep.*secret/i, type: 'isolation', severity: 'medium' as const },
      { pattern: /you.*owe.*me|you.*must/i, type: 'controlling', severity: 'high' as const },
    ];

    for (const msg of messages) {
      for (const { pattern, type, severity } of redFlagPatterns) {
        if (pattern.test(msg)) {
          flags.push({ type, severity, evidence: `Message contains concerning language`, recommendation: severity === 'high' ? 'Report and unmatch' : 'Proceed with caution' });
        }
      }
    }

    const overallRisk: RedFlagResult['overallRisk'] = flags.some(f => f.severity === 'high') ? 'danger' : flags.length > 2 ? 'warning' : flags.length > 0 ? 'caution' : 'safe';
    const safetyTips = ['Always meet in public places', 'Tell a friend where you are going', 'Trust your instincts', 'Never send money to someone you haven\'t met'];

    return { hasRedFlags: flags.length > 0, flags, overallRisk, safetyTips };
  }

  async suggestDate(user1: UserProfile, user2: UserProfile): Promise<DateSuggestion[]> {
    const shared = user1.interests.filter(i => user2.interests.includes(i));
    const dateTypes: DateSuggestion[] = [
      { id: this.genId('date'), type: 'activity', title: `${shared[0] || 'Bowling'} Night`, description: `Enjoy a fun activity together`, estimatedCost: '$30-60', duration: '2-3 hours', compatibility: 0.85, considerations: ['Casual atmosphere', 'Natural conversation opportunities'] },
      { id: this.genId('date'), type: 'restaurant', title: 'Dinner at a new spot', description: 'Try a restaurant neither of you has been to', estimatedCost: '$50-100', duration: '1.5-2 hours', compatibility: 0.75, considerations: ['Good for conversation', 'Choose a cuisine you both enjoy'] },
      { id: this.genId('date'), type: 'outdoor', title: 'Park walk & coffee', description: 'Low-pressure first meeting in a public park', estimatedCost: '$10-20', duration: '1-2 hours', compatibility: 0.9, considerations: ['Easy exit if needed', 'Relaxed environment'] },
      { id: this.genId('date'), type: 'cultural', title: 'Museum or gallery visit', description: 'Explore art together and learn about each other', estimatedCost: '$20-40', duration: '2-3 hours', compatibility: 0.7, considerations: ['Great conversation starters', 'Shows intellectual curiosity'] },
    ];

    return dateTypes.sort((a, b) => b.compatibility - a.compatibility);
  }
}

export const datingAIService = new DatingAIService();
export { DatingAIService };
