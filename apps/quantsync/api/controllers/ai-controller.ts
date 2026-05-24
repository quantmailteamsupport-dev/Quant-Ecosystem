// ============================================================================
// QuantSync - AI Controller
// AI content suggestions, fact-checking, content moderation, trending analysis
// ============================================================================

import type { Request, Response } from '../middleware';
import { aiService } from '../services/ai-service';
import { moderationService } from '../services/moderation-service';

class AIController {
  async getSuggestions(req: Request, res: Response): Promise<void> {
    const query = req.query as Record<string, string>;
    const type = query['type'] || 'caption';
    const topic = query['topic'];
    const mood = query['mood'];

    let suggestions;
    switch (type) {
      case 'caption':
        suggestions = aiService.generateCaptionSuggestions({ topic, mood });
        break;
      case 'hashtag':
        const content = query['content'] || '';
        suggestions = aiService.generateHashtagSuggestions(content);
        break;
      case 'reply':
        const postContent = query['postContent'] || '';
        suggestions = aiService.generateReplySuggestions(postContent);
        break;
      case 'post_idea':
        const interests = (query['interests'] || 'technology').split(',');
        suggestions = aiService.generatePostIdeas(req.userId!, interests);
        break;
      default:
        suggestions = aiService.generateCaptionSuggestions({ topic, mood });
    }

    res.status(200).json({ success: true, data: suggestions });
  }

  async factCheck(req: Request, res: Response): Promise<void> {
    const body = req.body as { postId: string; content: string };

    if (!body.content) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Content to fact-check is required', statusCode: 400 } });
      return;
    }

    const result = await aiService.factCheck(body.postId || `temp_${Date.now()}`, body.content);
    res.status(200).json({ success: true, data: result });
  }

  async moderateContent(req: Request, res: Response): Promise<void> {
    const body = req.body as { content: string; authorId?: string };

    if (!body.content) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Content to moderate is required', statusCode: 400 } });
      return;
    }

    const analysis = moderationService.analyzeContent(body.content, body.authorId || 'unknown');
    const sentiment = aiService.analyzeSentiment(body.content);
    const classification = aiService.classifyContent(body.content);

    res.status(200).json({
      success: true,
      data: {
        moderation: analysis,
        sentiment,
        classification,
        recommendation: analysis.suggestedAction,
      },
    });
  }

  async analyzeTrending(req: Request, res: Response): Promise<void> {
    const body = req.body as { topic: string; posts?: any[] };

    if (!body.topic) {
      res.status(400).json({ success: false, error: { code: 'TOPIC_REQUIRED', message: 'Topic is required for analysis', statusCode: 400 } });
      return;
    }

    const analysis = aiService.analyzeTrendingPattern(body.topic, body.posts || []);
    res.status(200).json({ success: true, data: analysis });
  }

  async classifyContent(req: Request, res: Response): Promise<void> {
    const body = req.body as { content: string };

    if (!body.content) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Content is required', statusCode: 400 } });
      return;
    }

    const classification = aiService.classifyContent(body.content);
    res.status(200).json({ success: true, data: classification });
  }

  async analyzeSentiment(req: Request, res: Response): Promise<void> {
    const body = req.body as { content: string };

    if (!body.content) {
      res.status(400).json({ success: false, error: { code: 'CONTENT_REQUIRED', message: 'Content is required', statusCode: 400 } });
      return;
    }

    const sentiment = aiService.analyzeSentiment(body.content);
    res.status(200).json({ success: true, data: sentiment });
  }
}

export const aiController = new AIController();
export default AIController;
