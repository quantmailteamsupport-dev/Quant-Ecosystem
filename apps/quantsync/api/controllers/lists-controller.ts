// ============================================================================
// QuantSync - Lists Controller
// ============================================================================

import { listsService } from '../services/lists-service';

interface Request { params: Record<string, string>; query: Record<string, string>; body: any; user?: { id: string } }
interface Response { status: (code: number) => Response; json: (data: any) => void }

export const listsController = {
  async getUserLists(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const result = await listsService.getUserLists(userId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { name, description, isPublic } = req.body;
      if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
      const list = await listsService.createList(userId, { name, description, isPublic });
      res.status(201).json(list);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const list = await listsService.getList(req.params.id, userId);
      if (!list) { res.status(404).json({ error: 'List not found' }); return; }
      res.status(200).json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const list = await listsService.updateList(req.params.id, userId, req.body);
      res.status(200).json(list);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async deleteList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      await listsService.deleteList(req.params.id, userId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getFollowingLists(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const result = await listsService.getFollowingLists(userId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async discoverLists(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit || '20');
      const result = await listsService.discoverLists({ limit });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getListTimeline(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const limit = parseInt(req.query.limit || '20');
      const cursor = req.query.cursor;
      const result = await listsService.getListTimeline(req.params.id, userId, { limit, cursor });
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const result = await listsService.getMembers(req.params.id, userId);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async addMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      const { memberId } = req.body;
      await listsService.addMember(req.params.id, userId, memberId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      await listsService.removeMember(req.params.id, userId, req.params.memberId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async followList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      await listsService.followList(req.params.id, userId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async pinList(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      await listsService.pinList(req.params.id, userId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
};
