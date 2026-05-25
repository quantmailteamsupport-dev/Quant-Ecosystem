// ============================================================================
// Payments - Payment Gateway Service
// Abstract gateway layer supporting multiple providers with retry logic
// ============================================================================

import type {
  ChargeRequest,
  ChargeResult,
  Customer,
  PaymentGatewayConfig,
  PaymentMethod,
  PaymentMethodType,
  Transaction,
  TransactionStatus,
  GatewayProvider,
  CurrencyCode,
  CardDetails,
  RefundRequest,
  RefundStatus,
} from '../types';

/** Default gateway configuration */
const DEFAULT_CONFIG: PaymentGatewayConfig = {
  provider: 'stripe',
  apiKey: '',
  secretKey: '',
  webhookSecret: '',
  environment: 'sandbox',
  currency: 'USD',
  retryAttempts: 3,
  retryDelayMs: 1000,
  idempotencyTTL: 86400000,
  metadata: {},
};

/**
 * PaymentGateway - Abstract payment processing layer
 *
 * Provides a unified interface for payment operations across multiple
 * gateway providers (Stripe, PayPal, etc.) with retry logic, idempotency
 * key management, and comprehensive error handling.
 */
export class PaymentGateway {
  private config: PaymentGatewayConfig;
  private transactions: Map<string, Transaction>;
  private customers: Map<string, Customer>;
  private paymentMethods: Map<string, PaymentMethod>;
  private idempotencyKeys: Map<string, { result: ChargeResult; expiresAt: number }>;
  private refunds: Map<string, RefundRequest>;
  private transactionCounter: number = 0;

  constructor(config: Partial<PaymentGatewayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.transactions = new Map();
    this.customers = new Map();
    this.paymentMethods = new Map();
    this.idempotencyKeys = new Map();
    this.refunds = new Map();
  }

  /**
   * Process a payment charge
   * Handles retry logic, idempotency, and gateway-specific error mapping
   */
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    // Check idempotency key
    const cached = this.idempotencyKeys.get(request.idempotencyKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // Validate request
    this.validateChargeRequest(request);

    // Get payment method
    const paymentMethod = this.paymentMethods.get(request.paymentMethodId);
    if (!paymentMethod) {
      return this.createFailureResult('payment_method_not_found', 'Payment method not found');
    }

    // Validate card if applicable
    if (paymentMethod.type === 'card' && paymentMethod.card) {
      const cardValidation = this.validateCard(paymentMethod.card);
      if (!cardValidation.valid) {
        return this.createFailureResult(cardValidation.code!, cardValidation.reason!);
      }
    }

    // Attempt charge with retry logic
    let lastError: string = '';
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const result = await this.processCharge(request, paymentMethod);
        // Cache idempotency result
        this.idempotencyKeys.set(request.idempotencyKey, {
          result,
          expiresAt: Date.now() + this.config.idempotencyTTL,
        });
        return result;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        // Only retry on retryable errors
        if (!this.isRetryableError(lastError)) {
          break;
        }
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelayMs * Math.pow(2, attempt));
        }
      }
    }

    return this.createFailureResult('charge_failed', lastError);
  }

  /** Process a refund for a transaction */
  async refund(transactionId: string, amount?: number, reason?: string): Promise<RefundRequest> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== 'completed') {
      throw new Error(`Cannot refund transaction with status: ${transaction.status}`);
    }

    const refundAmount = amount || transaction.amount;
    const maxRefundable = transaction.amount - transaction.refundedAmount;

    if (refundAmount > maxRefundable) {
      throw new Error(`Refund amount ${refundAmount} exceeds maximum refundable ${maxRefundable}`);
    }

    const refund: RefundRequest = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId,
      amount: refundAmount,
      currency: transaction.currency,
      reason: reason || 'Requested by customer',
      status: 'processing' as RefundStatus,
      requestedBy: transaction.customerId,
      createdAt: Date.now(),
    };

    // Process refund
    refund.status = 'completed';
    refund.processedAt = Date.now();

    // Update transaction
    transaction.refundedAmount += refundAmount;
    transaction.status = transaction.refundedAmount >= transaction.amount ? 'refunded' : 'partially_refunded';
    transaction.updatedAt = Date.now();

    this.refunds.set(refund.id, refund);
    return refund;
  }

  /** Create a new customer */
  async createCustomer(data: { email: string; name: string; phone?: string; metadata?: Record<string, string> }): Promise<Customer> {
    const customer: Customer = {
      id: `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      name: data.name,
      phone: data.phone,
      metadata: data.metadata || {},
      createdAt: Date.now(),
    };

    this.customers.set(customer.id, customer);
    return customer;
  }

  /** Attach a payment method to a customer */
  async attachPaymentMethod(customerId: string, methodData: {
    type: PaymentMethodType;
    card?: CardDetails;
    isDefault?: boolean;
  }): Promise<PaymentMethod> {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const method: PaymentMethod = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      type: methodData.type,
      isDefault: methodData.isDefault || false,
      card: methodData.card,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
    };

    // If set as default, unset other defaults
    if (method.isDefault) {
      for (const [, pm] of this.paymentMethods) {
        if (pm.customerId === customerId) {
          pm.isDefault = false;
        }
      }
      customer.defaultPaymentMethodId = method.id;
    }

    this.paymentMethods.set(method.id, method);
    return method;
  }

  /** Detach a payment method from a customer */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    const method = this.paymentMethods.get(paymentMethodId);
    if (!method) {
      throw new Error(`Payment method not found: ${paymentMethodId}`);
    }

    const customer = this.customers.get(method.customerId);
    if (customer && customer.defaultPaymentMethodId === paymentMethodId) {
      customer.defaultPaymentMethodId = undefined;
    }

    this.paymentMethods.delete(paymentMethodId);
  }

  /** List payment methods for a customer */
  async listPaymentMethods(customerId: string, type?: PaymentMethodType): Promise<PaymentMethod[]> {
    const methods: PaymentMethod[] = [];
    for (const [, method] of this.paymentMethods) {
      if (method.customerId === customerId) {
        if (!type || method.type === type) {
          methods.push(method);
        }
      }
    }
    return methods.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Get a transaction by ID */
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    return this.transactions.get(transactionId) || null;
  }

  /** Validate a card's details */
  validateCard(card: CardDetails): { valid: boolean; code?: string; reason?: string } {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check expiration
    if (card.expYear < currentYear || (card.expYear === currentYear && card.expMonth < currentMonth)) {
      return { valid: false, code: 'card_expired', reason: 'Card has expired' };
    }

    // Check CVC
    if (card.cvcCheck === 'fail') {
      return { valid: false, code: 'cvc_check_failed', reason: 'CVC verification failed' };
    }

    // Validate card number format via last4
    if (!/^\d{4}$/.test(card.last4)) {
      return { valid: false, code: 'invalid_card', reason: 'Invalid card number' };
    }

    // Validate expiry month
    if (card.expMonth < 1 || card.expMonth > 12) {
      return { valid: false, code: 'invalid_expiry', reason: 'Invalid expiration month' };
    }

    return { valid: true };
  }

  /** Get customer by ID */
  async getCustomer(customerId: string): Promise<Customer | null> {
    return this.customers.get(customerId) || null;
  }

  /** Get transactions for a customer */
  async getCustomerTransactions(customerId: string, limit: number = 50): Promise<Transaction[]> {
    const txns: Transaction[] = [];
    for (const [, txn] of this.transactions) {
      if (txn.customerId === customerId) {
        txns.push(txn);
      }
    }
    return txns.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  // --- Private Methods ---

  private async processCharge(request: ChargeRequest, method: PaymentMethod): Promise<ChargeResult> {
    this.transactionCounter++;
    const txnId = `txn_${Date.now()}_${this.transactionCounter}`;

    // Simulate gateway-specific processing
    const gatewayResult = this.simulateGatewayCharge(request.amount, method);

    const transaction: Transaction = {
      id: txnId,
      customerId: request.customerId,
      paymentMethodId: request.paymentMethodId,
      amount: request.amount,
      currency: request.currency,
      status: gatewayResult.success ? 'completed' : 'failed',
      description: request.description,
      gateway: this.config.provider,
      gatewayTransactionId: `gw_${this.config.provider}_${Date.now()}`,
      idempotencyKey: request.idempotencyKey,
      failureReason: gatewayResult.failureReason,
      failureCode: gatewayResult.failureCode,
      refundedAmount: 0,
      metadata: request.metadata || {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: gatewayResult.success ? Date.now() : undefined,
    };

    this.transactions.set(txnId, transaction);

    return {
      success: gatewayResult.success,
      transactionId: txnId,
      gatewayTransactionId: transaction.gatewayTransactionId,
      status: transaction.status,
      failureReason: gatewayResult.failureReason,
      failureCode: gatewayResult.failureCode,
    };
  }

  private simulateGatewayCharge(amount: number, method: PaymentMethod): { success: boolean; failureReason?: string; failureCode?: string } {
    // Simulate declined for specific test amounts
    if (amount === 99999) {
      return { success: false, failureReason: 'Insufficient funds', failureCode: 'insufficient_funds' };
    }
    if (amount === 88888) {
      return { success: false, failureReason: 'Card declined by issuer', failureCode: 'card_declined' };
    }
    if (amount === 77777) {
      return { success: false, failureReason: 'Suspected fraud', failureCode: 'fraud_detected' };
    }
    return { success: true };
  }

  private validateChargeRequest(request: ChargeRequest): void {
    if (request.amount <= 0) {
      throw new Error('Charge amount must be positive');
    }
    if (request.amount > 99999999) {
      throw new Error('Charge amount exceeds maximum limit');
    }
    if (!request.customerId) {
      throw new Error('Customer ID is required');
    }
    if (!request.idempotencyKey) {
      throw new Error('Idempotency key is required');
    }
  }

  private createFailureResult(code: string, reason: string): ChargeResult {
    return {
      success: false,
      status: 'failed' as TransactionStatus,
      failureCode: code,
      failureReason: reason,
    };
  }

  private isRetryableError(error: string): boolean {
    const retryableErrors = ['timeout', 'network_error', 'rate_limited', 'gateway_unavailable'];
    return retryableErrors.some(e => error.toLowerCase().includes(e));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
