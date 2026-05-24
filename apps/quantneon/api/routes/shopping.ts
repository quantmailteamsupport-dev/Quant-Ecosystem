// ============================================================================
// QuantNeon API - Shopping Routes
// In-app shopping, product tags, stores, checkout, wishlists, reviews
// ============================================================================

import { shoppingController } from '../controllers/shopping-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const shoppingRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/shopping', handler: (req, res) => shoppingController.getShop(req, res), requiresAuth: false },
  { method: 'GET', path: '/shopping/products', handler: (req, res) => shoppingController.listProducts(req, res), requiresAuth: false },
  { method: 'GET', path: '/shopping/products/:id', handler: (req, res) => shoppingController.getProduct(req, res), requiresAuth: false },
  { method: 'GET', path: '/shopping/stores/:storeId', handler: (req, res) => shoppingController.getStore(req, res), requiresAuth: false },
  { method: 'POST', path: '/shopping/cart', handler: (req, res) => shoppingController.addToCart(req, res), requiresAuth: true },
  { method: 'GET', path: '/shopping/cart', handler: (req, res) => shoppingController.getCart(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/shopping/cart/:itemId', handler: (req, res) => shoppingController.removeFromCart(req, res), requiresAuth: true },
  { method: 'POST', path: '/shopping/checkout', handler: (req, res) => shoppingController.checkout(req, res), requiresAuth: true },
  { method: 'POST', path: '/shopping/wishlist', handler: (req, res) => shoppingController.addToWishlist(req, res), requiresAuth: true },
  { method: 'GET', path: '/shopping/wishlist', handler: (req, res) => shoppingController.getWishlist(req, res), requiresAuth: true },
  { method: 'POST', path: '/shopping/products/:id/review', handler: (req, res) => shoppingController.addReview(req, res), requiresAuth: true },
  { method: 'GET', path: '/shopping/orders', handler: (req, res) => shoppingController.getOrders(req, res), requiresAuth: true },
];
