// ============================================================================
// QuantMail API - Rules Controller
// CRUD operations for email rules engine
// ============================================================================

import type { Request, Response } from '../middleware';
import { rulesEngine } from '../services/rules-engine-service';

export class RulesController {
  async createRule(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { name: string; description?: string; conditionGroup: any; actions: any[]; priority?: number; stopProcessing?: boolean };

    if (!body.name || !body.conditionGroup || !body.actions) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Name, conditions, and actions are required', statusCode: 400 } });
      return;
    }

    try {
      const rule = await rulesEngine.createRule(userId, body);
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create rule';
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getRules(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const rules = await rulesEngine.getRules(userId);
    res.status(200).json({ success: true, data: rules, metadata: { count: rules.length } });
  }

  async getRule(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const ruleId = req.params['ruleId'];
    const rules = await rulesEngine.getRules(userId);
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rule not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: rule });
  }

  async updateRule(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const ruleId = req.params['ruleId'];
    const body = req.body;

    try {
      const rule = await rulesEngine.updateRule(ruleId, userId, body);
      res.status(200).json({ success: true, data: rule });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update rule';
      const statusCode = msg.includes('not found') ? 404 : 400;
      res.status(statusCode).json({ success: false, error: { code: 'UPDATE_FAILED', message: msg, statusCode } });
    }
  }

  async deleteRule(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const ruleId = req.params['ruleId'];

    try {
      await rulesEngine.deleteRule(ruleId, userId);
      res.status(200).json({ success: true, data: { message: 'Rule deleted' } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete rule';
      res.status(404).json({ success: false, error: { code: 'DELETE_FAILED', message: msg, statusCode: 404 } });
    }
  }

  async toggleRule(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const ruleId = req.params['ruleId'];

    try {
      const rule = await rulesEngine.toggleRule(ruleId, userId);
      res.status(200).json({ success: true, data: rule });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to toggle rule';
      res.status(400).json({ success: false, error: { code: 'TOGGLE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async reorderRule(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const ruleId = req.params['ruleId'];
    const body = req.body as { priority: number };

    if (typeof body.priority !== 'number') {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Priority must be a number', statusCode: 400 } });
      return;
    }

    try {
      const rule = await rulesEngine.setRulePriority(ruleId, userId, body.priority);
      res.status(200).json({ success: true, data: rule });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to reorder rule';
      res.status(400).json({ success: false, error: { code: 'REORDER_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async evaluateRules(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { email: any };

    if (!body.email) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Email object is required', statusCode: 400 } });
      return;
    }

    try {
      const matches = await rulesEngine.evaluateRules(userId, body.email);
      res.status(200).json({ success: true, data: { matches, matchCount: matches.length } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to evaluate rules';
      res.status(400).json({ success: false, error: { code: 'EVALUATE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getRuleStats(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const stats = await rulesEngine.getRuleStats(userId);
    res.status(200).json({ success: true, data: stats });
  }
}

export const rulesController = new RulesController();
