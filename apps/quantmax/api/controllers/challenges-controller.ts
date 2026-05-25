// ============================================================================
// QuantMax - Challenges Controller
// Methods: listChallenges, createChallenge, getChallenge, submitEntry,
// getLeaderboard, moderate
// ============================================================================

import { challengesService } from '../services/challenges-service';

interface Request {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  user?: { id: string; displayName: string; followers?: number; verified?: boolean; role?: string };
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class ChallengesController {
  // GET /api/challenges - List challenges
  async listChallenges(req: Request, res: Response): Promise<void> {
    try {
      const { status, creatorId, trending } = req.query;
      const challenges = challengesService.listChallenges({
        status: status || undefined,
        creatorId: creatorId || undefined,
        trending: trending === 'true',
      });

      res.status(200).json({
        success: true,
        data: {
          challenges,
          total: challenges.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to list challenges', detail: error.message });
    }
  }

  // POST /api/challenges - Create challenge
  async createChallenge(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, hashtag, rules, durationDays, prizes } = req.body;
      const userId = req.user?.id;
      const displayName = req.user?.displayName || 'Unknown';
      const followers = req.user?.followers || 0;
      const verified = req.user?.verified || false;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      if (!title || title.trim().length < 3) {
        res.status(400).json({ success: false, error: 'Title must be at least 3 characters' });
        return;
      }
      if (!hashtag || hashtag.trim().length < 2) {
        res.status(400).json({ success: false, error: 'Hashtag is required' });
        return;
      }
      if (!durationDays || durationDays < 1 || durationDays > 7) {
        res.status(400).json({ success: false, error: 'Duration must be 1-7 days' });
        return;
      }
      if (!Array.isArray(prizes) || prizes.length === 0) {
        res.status(400).json({ success: false, error: 'At least one prize is required' });
        return;
      }

      const result = challengesService.createChallenge({
        creatorId: userId,
        creatorName: displayName,
        title: title.trim(),
        description: description || '',
        hashtag: hashtag.trim(),
        rules: Array.isArray(rules) ? rules : [],
        durationDays,
        prizes,
        creatorFollowers: followers,
        creatorVerified: verified,
      });

      if (!result.success) {
        res.status(403).json({ success: false, error: result.error });
        return;
      }

      res.status(201).json({ success: true, data: { challenge: result.challenge } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to create challenge', detail: error.message });
    }
  }

  // GET /api/challenges/:id - Get challenge
  async getChallenge(req: Request, res: Response): Promise<void> {
    try {
      const challengeId = req.params.id;
      if (!challengeId) {
        res.status(400).json({ success: false, error: 'Challenge ID required' });
        return;
      }

      const challenge = challengesService.getChallenge(challengeId);
      if (!challenge) {
        res.status(404).json({ success: false, error: 'Challenge not found' });
        return;
      }

      res.status(200).json({ success: true, data: { challenge } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to get challenge', detail: error.message });
    }
  }

  // POST /api/challenges/:id/submit - Submit entry
  async submitEntry(req: Request, res: Response): Promise<void> {
    try {
      const challengeId = req.params.id;
      const { videoId, videoUrl, thumbnailUrl } = req.body;
      const userId = req.user?.id;
      const userName = req.user?.displayName || 'Anonymous';

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }
      if (!videoId || !videoUrl) {
        res.status(400).json({ success: false, error: 'Video ID and URL are required' });
        return;
      }

      const result = challengesService.submitEntry({
        challengeId,
        userId,
        userName,
        videoId,
        videoUrl,
        thumbnailUrl: thumbnailUrl || '',
      });

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.status(201).json({ success: true, data: { submission: result.submission } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to submit entry', detail: error.message });
    }
  }

  // GET /api/challenges/:id/leaderboard - Get leaderboard
  async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const challengeId = req.params.id;
      const limit = parseInt(req.query.limit || '50', 10);

      if (!challengeId) {
        res.status(400).json({ success: false, error: 'Challenge ID required' });
        return;
      }

      const leaderboard = challengesService.getLeaderboard(challengeId, limit);

      res.status(200).json({
        success: true,
        data: { leaderboard, total: leaderboard.length },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to get leaderboard', detail: error.message });
    }
  }

  // POST /api/challenges/:id/moderate - Moderate
  async moderate(req: Request, res: Response): Promise<void> {
    try {
      const { targetId, targetType, action, reason } = req.body;
      const moderatorId = req.user?.id;
      const role = req.user?.role;

      if (!moderatorId || role !== 'moderator') {
        res.status(403).json({ success: false, error: 'Moderator access required' });
        return;
      }
      if (!targetId || !targetType || !action) {
        res.status(400).json({ success: false, error: 'targetId, targetType, and action are required' });
        return;
      }
      if (!['approve', 'reject', 'flag'].includes(action)) {
        res.status(400).json({ success: false, error: 'Action must be approve, reject, or flag' });
        return;
      }

      const result = challengesService.moderate({ targetId, targetType, action, moderatorId, reason });

      res.status(200).json({ success: true, data: { moderated: result.success } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'Failed to moderate', detail: error.message });
    }
  }
}

export default ChallengesController;
