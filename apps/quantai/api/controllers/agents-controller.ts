// ============================================================================
// QuantAI - Agents Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { agentsService } from '../services/agents-service';

class AgentsController {
  async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body as any;
      if (!config.userId || !config.name || !config.goals) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'userId, name, and goals required' } }); return; }
      const agent = await agentsService.createAgent(config);
      res.status(201).json({ success: true, data: agent });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } }); }
  }

  async executeAction(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params as { agentId: string };
      const { actionType, params } = req.body as any;
      if (!actionType) { res.status(400).json({ success: false, error: { code: 'MISSING_ACTION', message: 'actionType required' } }); return; }
      const action = await agentsService.executeAction(agentId, actionType, params || {});
      res.status(200).json({ success: true, data: action });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'EXEC_ERROR', message: error.message } }); }
  }

  async chainActions(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params as { agentId: string };
      const { actions } = req.body as { actions: any[] };
      if (!actions || actions.length === 0) { res.status(400).json({ success: false, error: { code: 'MISSING_ACTIONS', message: 'actions array required' } }); return; }
      const chain = await agentsService.chainActions(agentId, actions);
      res.status(200).json({ success: true, data: chain });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'CHAIN_ERROR', message: error.message } }); }
  }

  async getState(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params as { agentId: string };
      const state = await agentsService.getAgentState(agentId);
      res.status(200).json({ success: true, data: state });
    } catch (error: any) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } }); }
  }

  async pauseAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params as { agentId: string };
      const agent = await agentsService.pauseAgent(agentId);
      res.status(200).json({ success: true, data: agent });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'PAUSE_ERROR', message: error.message } }); }
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params as { agentId: string };
      const { limit } = req.query as { limit?: string };
      const history = await agentsService.getAgentHistory(agentId, Number(limit) || 50);
      res.status(200).json({ success: true, data: history });
    } catch (error: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }); }
  }
}

export const agentsController = new AgentsController();
export { AgentsController };
