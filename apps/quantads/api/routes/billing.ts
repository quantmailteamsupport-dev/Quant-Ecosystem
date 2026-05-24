// ============================================================================
// QuantAds API - Billing Routes
// ============================================================================

import { billingController } from '../controllers/billing-controller';
import type { RouteDefinition } from './campaigns';

export const billingRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/billing/balance', handler: (req, res) => billingController.getBalance(req, res), requiresAuth: true },
  { method: 'POST', path: '/billing/add-funds', handler: (req, res) => billingController.addFunds(req, res), requiresAuth: true },
  { method: 'GET', path: '/billing/invoices', handler: (req, res) => billingController.listInvoices(req, res), requiresAuth: true },
  { method: 'GET', path: '/billing/invoices/:id', handler: (req, res) => billingController.getInvoice(req, res), requiresAuth: true },
  { method: 'GET', path: '/billing/payment-methods', handler: (req, res) => billingController.listPaymentMethods(req, res), requiresAuth: true },
  { method: 'POST', path: '/billing/payment-methods', handler: (req, res) => billingController.addPaymentMethod(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/billing/payment-methods/:id', handler: (req, res) => billingController.removePaymentMethod(req, res), requiresAuth: true },
  { method: 'PUT', path: '/billing/spending-limits', handler: (req, res) => billingController.setSpendingLimits(req, res), requiresAuth: true },
  { method: 'GET', path: '/billing/spending-history', handler: (req, res) => billingController.getSpendingHistory(req, res), requiresAuth: true },
];
