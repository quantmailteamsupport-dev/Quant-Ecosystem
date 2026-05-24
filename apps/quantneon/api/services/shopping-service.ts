// ============================================================================
// QuantNeon - Shopping Service
// E-commerce, inventory management, payment processing
// ============================================================================

interface ProductInventory {
  productId: string;
  variantId: string;
  quantity: number;
  reserved: number;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  error?: string;
}

interface ShippingEstimate {
  method: string;
  cost: number;
  estimatedDays: number;
  carrier: string;
}

class ShoppingService {
  private inventory: Map<string, ProductInventory> = new Map();

  checkInventory(productId: string, variantId: string, quantity: number): { available: boolean; remaining: number } {
    const key = `${productId}_${variantId}`;
    const inv = this.inventory.get(key) || { productId, variantId, quantity: 100, reserved: 0 };
    const available = inv.quantity - inv.reserved >= quantity;
    return { available, remaining: inv.quantity - inv.reserved };
  }

  reserveInventory(productId: string, variantId: string, quantity: number): boolean {
    const key = `${productId}_${variantId}`;
    const inv = this.inventory.get(key) || { productId, variantId, quantity: 100, reserved: 0 };
    if (inv.quantity - inv.reserved < quantity) return false;
    inv.reserved += quantity;
    this.inventory.set(key, inv);
    return true;
  }

  processPayment(amount: number, currency: string, paymentMethod: string): PaymentResult {
    // Simulate payment processing
    const success = Math.random() > 0.05; // 95% success rate simulation
    return {
      success,
      transactionId: `txn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      amount,
      currency,
      status: success ? 'completed' : 'failed',
      error: success ? undefined : 'Payment declined',
    };
  }

  calculateShipping(items: { weight: number; dimensions: { l: number; w: number; h: number } }[], destination: string): ShippingEstimate[] {
    const totalWeight = items.reduce((s, i) => s + i.weight, 0);
    return [
      { method: 'standard', cost: 4.99 + totalWeight * 0.5, estimatedDays: 5, carrier: 'QuantShip Standard' },
      { method: 'express', cost: 9.99 + totalWeight * 1.0, estimatedDays: 2, carrier: 'QuantShip Express' },
      { method: 'overnight', cost: 19.99 + totalWeight * 2.0, estimatedDays: 1, carrier: 'QuantShip Priority' },
    ];
  }

  calculateTax(subtotal: number, region: string): { taxRate: number; taxAmount: number } {
    const rates: Record<string, number> = { US: 0.08, UK: 0.20, EU: 0.21, CA: 0.13, AU: 0.10 };
    const rate = rates[region] || 0.10;
    return { taxRate: rate, taxAmount: subtotal * rate };
  }

  calculateDiscount(code: string, subtotal: number): { valid: boolean; discount: number; type: 'percentage' | 'fixed' } {
    const codes: Record<string, { type: 'percentage' | 'fixed'; value: number }> = {
      NEON10: { type: 'percentage', value: 10 },
      SAVE20: { type: 'percentage', value: 20 },
      FLAT5: { type: 'fixed', value: 5 },
    };
    const promo = codes[code.toUpperCase()];
    if (!promo) return { valid: false, discount: 0, type: 'fixed' };
    const discount = promo.type === 'percentage' ? subtotal * (promo.value / 100) : promo.value;
    return { valid: true, discount, type: promo.type };
  }
}

export const shoppingService = new ShoppingService();
