// ============================================================================
// QuantNeon API - Stories Controller
// 24hr stories, interactive stickers (polls, questions, sliders, countdowns, quizzes, music)
// ============================================================================

import type { Request, Response } from '../middleware';

interface Story {
  id: string;
  userId: string;
  username: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration: number;
  stickers: Sticker[];
  viewers: string[];
  replies: { userId: string; text: string; timestamp: string }[];
  reactions: { userId: string; emoji: string }[];
  expiresAt: string;
  createdAt: string;
  isCloseFriends: boolean;
}

interface Sticker {
  id: string;
  type: 'poll' | 'question' | 'slider' | 'countdown' | 'quiz' | 'music' | 'mention' | 'location' | 'link';
  position: { x: number; y: number };
  data: any;
  responses?: any[];
}

interface Highlight {
  id: string;
  userId: string;
  title: string;
  coverUrl: string;
  storyIds: string[];
  createdAt: string;
}

const stories: Map<string, Story> = new Map();
const highlights: Map<string, Highlight[]> = new Map();

class StoriesController {
  async createStory(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const storyId = `story_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const story: Story = { id: storyId, userId: req.userId || '', username: req.user?.username || '', mediaUrl: body.mediaUrl || '', mediaType: body.mediaType || 'image', duration: body.duration || 5, stickers: (body.stickers || []).map((s: any, i: number) => ({ id: `sticker_${i}`, type: s.type, position: s.position || { x: 0.5, y: 0.5 }, data: s.data || {}, responses: [] })), viewers: [], replies: [], reactions: [], expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(), createdAt: new Date().toISOString(), isCloseFriends: body.isCloseFriends || false };
    stories.set(storyId, story);
    res.status(201).json({ success: true, data: { story } });
  }

  async getStoriesFeed(req: Request, res: Response): Promise<void> {
    const activeStories = Array.from(stories.values()).filter(s => Date.parse(s.expiresAt) > Date.now());
    // Group by user
    const grouped: Record<string, Story[]> = {};
    for (const story of activeStories) {
      if (!grouped[story.userId]) grouped[story.userId] = [];
      grouped[story.userId].push(story);
    }
    const feed = Object.entries(grouped).map(([userId, userStories]) => ({ userId, username: userStories[0].username, stories: userStories.map(s => ({ id: s.id, mediaType: s.mediaType, isViewed: s.viewers.includes(req.userId || '') })), latestAt: userStories[userStories.length - 1].createdAt }));
    feed.sort((a, b) => Date.parse(b.latestAt) - Date.parse(a.latestAt));
    res.status(200).json({ success: true, data: { feed } });
  }

  async getUserStories(req: Request, res: Response): Promise<void> {
    const userStories = Array.from(stories.values()).filter(s => s.userId === req.params.userId && Date.parse(s.expiresAt) > Date.now());
    res.status(200).json({ success: true, data: { stories: userStories } });
  }

  async getStory(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found or expired', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { story } });
  }

  async deleteStory(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } }); return; }
    if (story.userId !== req.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized', statusCode: 403 } }); return; }
    stories.delete(req.params.id);
    res.status(200).json({ success: true, data: { message: 'Story deleted' } });
  }

  async markViewed(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } }); return; }
    if (!story.viewers.includes(req.userId || '')) story.viewers.push(req.userId || '');
    res.status(200).json({ success: true, data: { viewed: true, viewCount: story.viewers.length } });
  }

  async replyToStory(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    story.replies.push({ userId: req.userId || '', text: body.text, timestamp: new Date().toISOString() });
    res.status(200).json({ success: true, data: { replied: true } });
  }

  async reactToStory(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    story.reactions.push({ userId: req.userId || '', emoji: body.emoji || 'heart' });
    res.status(200).json({ success: true, data: { reacted: true } });
  }

  async votePoll(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const poll = story.stickers.find(s => s.type === 'poll');
    if (poll) { if (!poll.responses) poll.responses = []; poll.responses.push({ userId: req.userId, option: body.option }); }
    res.status(200).json({ success: true, data: { voted: true, option: body.option } });
  }

  async answerQuestion(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const question = story.stickers.find(s => s.type === 'question');
    if (question) { if (!question.responses) question.responses = []; question.responses.push({ userId: req.userId, answer: body.answer }); }
    res.status(200).json({ success: true, data: { answered: true } });
  }

  async respondSlider(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const slider = story.stickers.find(s => s.type === 'slider');
    if (slider) { if (!slider.responses) slider.responses = []; slider.responses.push({ userId: req.userId, value: body.value }); }
    res.status(200).json({ success: true, data: { responded: true, value: body.value } });
  }

  async answerQuiz(req: Request, res: Response): Promise<void> {
    const story = stories.get(req.params.id);
    if (!story) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Story not found', statusCode: 404 } }); return; }
    const body = req.body as any;
    const quiz = story.stickers.find(s => s.type === 'quiz');
    const correct = quiz?.data?.correctAnswer === body.answer;
    if (quiz) { if (!quiz.responses) quiz.responses = []; quiz.responses.push({ userId: req.userId, answer: body.answer, correct }); }
    res.status(200).json({ success: true, data: { answered: true, correct } });
  }

  async createHighlight(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    const userId = req.userId || '';
    const highlight: Highlight = { id: `hl_${Date.now().toString(36)}`, userId, title: body.title || 'Highlight', coverUrl: body.coverUrl || '', storyIds: body.storyIds || [], createdAt: new Date().toISOString() };
    const userHighlights = highlights.get(userId) || [];
    userHighlights.push(highlight);
    highlights.set(userId, userHighlights);
    res.status(201).json({ success: true, data: { highlight } });
  }

  async getHighlights(req: Request, res: Response): Promise<void> {
    const userHighlights = highlights.get(req.params.userId) || [];
    res.status(200).json({ success: true, data: { highlights: userHighlights } });
  }
}

export const storiesController = new StoriesController();
