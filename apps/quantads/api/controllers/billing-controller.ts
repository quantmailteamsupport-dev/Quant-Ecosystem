// ============================================================================
// QuantAds - Billing Controller
// Advertiser billing, invoices, payment methods, spending limits
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Invoice, PaymentMethod } from '../../src/types';

class BillingController {
  private invoices: Map<string, Invoice> = new Map();
  private paymentMethods: Map<string, PaymentMethod[]> = new Map();
  private spendingLimits: Map<string, { daily: number; monthly: number; lifetime: number }> = new Map();
  private balances: Map<string, number> = new Map();

  async getBalance(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const balance = this.balances.get(userId) || 0;
    const limit = this.spendingLimits.get(userId) || { daily: 1000, monthly: 30000, lifetime: Infinity };

    res.status(200).json({
      success: true,
      data: { balance, currency: 'USD', spendingLimits: limit },
    });
  }

  async addFunds(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { amount: number; paymentMethodId: string };

    if (!body.amount || body.amount <= 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Amount must be positive', statusCode: 400 } });
      return;
    }

    const current = this.balances.get(userId) || 0;
    this.balances.set(userId, current + body.amount);

    res.status(200).json({
      success: true,
      data: { balance: current + body.amount, added: body.amount },
    });
  }

  async listInvoices(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const invoices = Array.from(this.invoices.values())
      .filter(i => i.advertiserId === userId)
      .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());

    res.status(200).json({ success: true, data: invoices });
  }

  async getInvoice(req: Request, res: Response): Promise<void> {
    const id = req.params['id'];
    const invoice = this.invoices.get(id);
    if (!invoice) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: invoice });
  }

  async listPaymentMethods(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const methods = this.paymentMethods.get(userId) || [];
    res.status(200).json({ success: true, data: methods });
  }

  async addPaymentMethod(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { type: PaymentMethod['type']; last4: string; brand?: string; expiryMonth?: number; expiryYear?: number };

    const method: PaymentMethod = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: body.type,
      last4: body.last4,
      brand: body.brand,
      expiryMonth: body.expiryMonth,
      expiryYear: body.expiryYear,
      isDefault: false,
    };

    const existing = this.paymentMethods.get(userId) || [];
    if (existing.length === 0) method.isDefault = true;
    existing.push(method);
    this.paymentMethods.set(userId, existing);

    res.status(201).json({ success: true, data: method });
  }

  async removePaymentMethod(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const methodId = req.params['id'];
    const methods = this.paymentMethods.get(userId) || [];
    const filtered = methods.filter(m => m.id !== methodId);
    this.paymentMethods.set(userId, filtered);
    res.status(200).json({ success: true, data: { removed: true } });
  }

  async setSpendingLimits(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { daily?: number; monthly?: number; lifetime?: number };
    const current = this.spendingLimits.get(userId) || { daily: 1000, monthly: 30000, lifetime: Infinity };
    const updated = { ...current, ...body };
    this.spendingLimits.set(userId, updated);
    res.status(200).json({ success: true, data: updated });
  }

  async getSpendingHistory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const query = req.query as Record<string, string>;
    const period = query['period'] || '30d';

    // Return simulated spending history
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const history = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 86400000).toISOString().split('T')[0],
      spend: Math.round(Math.random() * 200 * 100) / 100,
      impressions: Math.floor(Math.random() * 10000),
      clicks: Math.floor(Math.random() * 500),
    }));

    res.status(200).json({ success: true, data: history });
  }
}

export const billingController = new BillingController();
export default BillingController;
