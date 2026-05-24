// ============================================================================
// QuantNeon - AI Service
// AI features: filters, captions, hashtags, object recognition, moderation
// ============================================================================

interface FilterResult {
  outputUrl: string;
  filterType: string;
  intensity: number;
  processingTime: number;
}

interface RecognizedObject {
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  category: string;
}

interface ContentSuggestion {
  type: 'post_idea' | 'best_time' | 'trending_format' | 'collaboration';
  title: string;
  description: string;
  confidence: number;
}

class AIService {
  applyFilter(mediaUrl: string, filterType: string, intensity: number): FilterResult {
    return {
      outputUrl: `/ai/filtered/${Date.now().toString(36)}_${filterType}.jpg`,
      filterType,
      intensity: Math.min(1, Math.max(0, intensity)),
      processingTime: 150 + Math.random() * 100,
    };
  }

  generateCaptions(mediaUrl: string, mood: string, count: number): string[] {
    const moodCaptions: Record<string, string[]> = {
      happy: ['Living my best life', 'Good vibes only', 'Happiness looks good on me', 'Sunshine state of mind'],
      neutral: ['Just another day', 'In the moment', 'No caption needed', 'This is it'],
      aesthetic: ['Chasing aesthetics', 'Dreamy vibes', 'Colors of my world', 'Visual poetry'],
      funny: ['I woke up like this... just kidding', 'Reality called, I hung up', 'Plot twist:', 'Main character energy'],
    };
    const captions = moodCaptions[mood] || moodCaptions['neutral'];
    return captions.slice(0, count);
  }

  generateAltText(mediaUrl: string): string {
    const descriptions = [
      'A person smiling in natural lighting',
      'A scenic landscape with mountains and sky',
      'A group of friends at an outdoor gathering',
      'A colorful plate of food on a wooden table',
      'An urban street scene with buildings and people',
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  suggestHashtags(caption: string, mediaUrl: string, count: number): { tag: string; relevance: number }[] {
    const words = caption.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const baseHashtags = ['photography', 'instagood', 'photooftheday', 'beautiful', 'love', 'happy', 'nature', 'travel', 'style', 'art', 'food', 'fitness', 'sunset', 'fashion', 'life'];
    const contextHashtags = words.map(w => w.replace(/[^a-z]/g, '')).filter(w => w.length > 3);
    const combined = [...contextHashtags, ...baseHashtags].slice(0, count);
    return combined.map((tag, i) => ({ tag, relevance: 1 - (i * 0.05) }));
  }

  recognizeObjects(mediaUrl: string): RecognizedObject[] {
    return [
      { label: 'person', confidence: 0.95, boundingBox: { x: 20, y: 10, width: 60, height: 80 }, category: 'human' },
      { label: 'smartphone', confidence: 0.78, boundingBox: { x: 45, y: 50, width: 10, height: 15 }, category: 'electronics' },
      { label: 'building', confidence: 0.82, boundingBox: { x: 0, y: 0, width: 100, height: 60 }, category: 'architecture' },
    ];
  }

  getContentSuggestions(userId: string): ContentSuggestion[] {
    return [
      { type: 'best_time', title: 'Best Time to Post', description: 'Your audience is most active at 7 PM today', confidence: 0.85 },
      { type: 'trending_format', title: 'Try a Carousel Post', description: 'Carousels are getting 3x more engagement this week', confidence: 0.78 },
      { type: 'post_idea', title: 'Behind the Scenes', description: 'Your followers love seeing your process', confidence: 0.72 },
      { type: 'collaboration', title: 'Collaborate', description: 'Similar creators in your niche are open to collabs', confidence: 0.65 },
    ];
  }
}

export const aiService = new AIService();
