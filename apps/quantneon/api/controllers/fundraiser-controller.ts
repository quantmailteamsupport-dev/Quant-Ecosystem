// ============================================================================
// QuantNeon - Fundraiser Controller
// ============================================================================

import type { Request, Response } from '../middleware';
import { fundraiserService } from '../services/fundraiser-service';

class FundraiserController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { creatorId, title, goal, beneficiary, description, category, durationDays, beneficiaryType } = req.body as any;
      if (!creatorId || !title || !goal || !beneficiary) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'creatorId, title, goal, and beneficiary required' } }); return; }
      const fundraiser = await fundraiserService.create(creatorId, title, goal, beneficiary, { description, category, durationDays, beneficiaryType });
      res.status(201).json({ success: true, data: fundraiser });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } }); }
  }

  async donate(req: Request, res: Response): Promise<void> {
    try {
      const { fundraiserId } = req.params as { fundraiserId: string };
      const { donorId, donorName, amount, message, isAnonymous } = req.body as any;
      if (!donorId || !donorName || !amount) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'donorId, donorName, and amount required' } }); return; }
      const donation = await fundraiserService.donate(fundraiserId, donorId, donorName, amount, { message, isAnonymous });
      res.status(201).json({ success: true, data: donation });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'DONATE_ERROR', message: error.message } }); }
  }

  async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const { fundraiserId } = req.params as { fundraiserId: string };
      const progress = await fundraiserService.getProgress(fundraiserId);
      res.status(200).json({ success: true, data: progress });
    } catch (error: any) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } }); }
  }

  async endFundraiser(req: Request, res: Response): Promise<void> {
    try {
      const { fundraiserId } = req.params as { fundraiserId: string };
      const { creatorId } = req.body as { creatorId: string };
      const fundraiser = await fundraiserService.endFundraiser(fundraiserId, creatorId);
      res.status(200).json({ success: true, data: fundraiser });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'END_ERROR', message: error.message } }); }
  }

  async getDonors(req: Request, res: Response): Promise<void> {
    try {
      const { fundraiserId } = req.params as { fundraiserId: string };
      const { limit, offset, sort } = req.query as any;
      const result = await fundraiserService.getDonors(fundraiserId, { limit: Number(limit), offset: Number(offset), sort });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } }); }
  }

  async withdraw(req: Request, res: Response): Promise<void> {
    try {
      const { fundraiserId } = req.params as { fundraiserId: string };
      const { creatorId, amount, destinationAccount } = req.body as any;
      const result = await fundraiserService.withdraw(fundraiserId, creatorId, amount, destinationAccount);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) { res.status(400).json({ success: false, error: { code: 'WITHDRAW_ERROR', message: error.message } }); }
  }
}

export const fundraiserController = new FundraiserController();
export { FundraiserController };
