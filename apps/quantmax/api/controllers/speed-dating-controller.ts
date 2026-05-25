// ============================================================================
// QuantMax - Speed Dating Controller
// Methods: listSessions, createSession, joinSession, extendTime,
// ratePartner, getHistory - each validates input, calls service, returns response
// ============================================================================

import { speedDatingService } from '../services/speed-dating-service';

interface Request {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  user?: { id: string; displayName: string };
}

interface Response {
  status(code: number): Response;
  json(data: any): void;
}

export class SpeedDatingController {
  // GET /api/speed-dating/sessions - List available sessions
  async listSessions(req: Request, res: Response): Promise<void> {
    try {
      const { status, upcoming } = req.query;
      const sessions = speedDatingService.listSessions({
        status: status || undefined,
        upcoming: upcoming === 'true',
      });

      res.status(200).json({
        success: true,
        data: {
          sessions,
          total: sessions.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to list sessions',
        detail: error.message,
      });
    }
  }

  // POST /api/speed-dating/sessions - Create a new session
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { title, startTime, durationMinutes, maxParticipants, pairDuration } = req.body;

      // Input validation
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Title is required' });
        return;
      }
      if (!startTime || typeof startTime !== 'number' || startTime < Date.now()) {
        res.status(400).json({ success: false, error: 'Valid future start time is required' });
        return;
      }
      if (!durationMinutes || durationMinutes < 15 || durationMinutes > 180) {
        res.status(400).json({ success: false, error: 'Duration must be 15-180 minutes' });
        return;
      }
      if (!maxParticipants || maxParticipants < 4 || maxParticipants > 100) {
        res.status(400).json({ success: false, error: 'Participants must be 4-100' });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const session = speedDatingService.createSession({
        hostId: userId,
        title: title.trim(),
        startTime,
        durationMinutes,
        maxParticipants,
        pairDuration: pairDuration || 180,
      });

      res.status(201).json({
        success: true,
        data: { session },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to create session',
        detail: error.message,
      });
    }
  }

  // POST /api/speed-dating/sessions/:id/join - Join a session
  async joinSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.id;
      const userId = req.user?.id;

      if (!sessionId) {
        res.status(400).json({ success: false, error: 'Session ID is required' });
        return;
      }
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = speedDatingService.joinSession(sessionId, userId);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          joined: true,
          waitlistPosition: result.position || null,
          isWaitlisted: result.position !== undefined,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to join session',
        detail: error.message,
      });
    }
  }

  // POST /api/speed-dating/sessions/:id/extend - Extend time
  async extendTime(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.id;
      const { pairId } = req.body;
      const userId = req.user?.id;

      if (!pairId) {
        res.status(400).json({ success: false, error: 'Pair ID is required' });
        return;
      }
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = speedDatingService.extendTime(pairId, userId);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          newEndTime: result.newEndTime,
          extensionsRemaining: result.extensionsRemaining,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to extend time',
        detail: error.message,
      });
    }
  }

  // POST /api/speed-dating/sessions/:id/rate - Rate partner
  async ratePartner(req: Request, res: Response): Promise<void> {
    try {
      const { pairId, rating, feedback } = req.body;
      const userId = req.user?.id;

      if (!pairId) {
        res.status(400).json({ success: false, error: 'Pair ID is required' });
        return;
      }
      if (!rating || !['thumbs_up', 'thumbs_down'].includes(rating)) {
        res.status(400).json({ success: false, error: 'Rating must be thumbs_up or thumbs_down' });
        return;
      }
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = speedDatingService.ratePair(pairId, userId, rating, feedback);

      if (!result.success) {
        res.status(400).json({ success: false, error: 'Failed to submit rating' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          rated: true,
          contactExchanged: result.contactExchanged || false,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to rate partner',
        detail: error.message,
      });
    }
  }

  // GET /api/speed-dating/sessions/:id/history - Get history
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const history = speedDatingService.getUserHistory(userId);

      res.status(200).json({
        success: true,
        data: {
          history,
          totalSessions: history.length,
          totalDates: history.reduce((sum, h) => sum + h.pairs.length, 0),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to get history',
        detail: error.message,
      });
    }
  }
}

export default SpeedDatingController;
