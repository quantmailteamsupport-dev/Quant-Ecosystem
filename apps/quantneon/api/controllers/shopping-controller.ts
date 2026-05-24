// ============================================================================
// QuantNeon API - Shopping Controller
// In-app shopping, product tags, stores, checkout, wishlists, reviews
// ============================================================================

import type { Request, Response } from '../middleware';

interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  inStock: boolean;
  variants: { id: string; name: string; price: number; inStock: boolean }[];
  rating: number;
  reviewCount: number;
}

interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: string;
}

const products: Map<string, Product> = new Map();
const carts: Map<string, CartItem[]> = new Map();
const wishlists: Map<string, string[]> = new Map();
const orders: Map<string, Order[]> = new Map();

class ShoppingController {
  async getShop(req: Request, res: Response): Promise<void> {
    const featured = Array.from(products.values()).slice(0, 10);
    res.status(200).json({ success: true, data: { featured, categories: ['fashion', 'beauty', 'home', 'electronics', 'accessories'] } });
  }

  async listProducts(req: Request, res: Response): Promise<void> {
    const query = req.query as any;
    let allProducts = Array.from(products.values());
    if (query.category) allProducts = allProducts.filter(p => p.category === query.category);
    if (query.storeId) allProducts = allProducts.filter(p => p.storeId === query.storeId);
    if (query.minPrice) allProducts = allProducts.filter(p => p.price >= parseFloat(query.minPrice));
    if (query.maxPrice) allProducts = allProducts.filter(p => p.price <= parseFloat(query.maxPrice));
    res.status(200).json({ success: true, data: { products: allProducts } });
  }

  async getProduct(req: Request, res: Response): Promise<void> {
    const product = products.get(req.params.id);
    if (!product) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found', statusCode: 404 } }); return; }
    res.status(200).json({ success: true, data: { product } });
  }

  async getStore(req: Request, res: Response): Promise<void> {
    const storeProducts = Array.from(products.values()).filter(p => p.storeId === req.params.storeId);
    res.status(200).json({ success: true, data: { storeId: req.params.storeId, products: storeProducts, productCount: storeProducts.length } });
  }

  async addToCart(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const body = req.body as any;
    const cart = carts.get(userId) || [];
    const existingIdx = cart.findIndex(i => i.productId === body.productId && i.variantId === body.variantId);
    if (existingIdx > -1) { cart[existingIdx].quantity += body.quantity || 1; }
    else { cart.push({ productId: body.productId, variantId: body.variantId, quantity: body.quantity || 1, price: body.price || 0 }); }
    carts.set(userId, cart);
    res.status(200).json({ success: true, data: { cart, itemCount: cart.reduce((s, i) => s + i.quantity, 0), total: cart.reduce((s, i) => s + i.price * i.quantity, 0) } });
  }

  async getCart(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const cart = carts.get(userId) || [];
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    res.status(200).json({ success: true, data: { cart, total, itemCount: cart.reduce((s, i) => s + i.quantity, 0) } });
  }

  async removeFromCart(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const cart = carts.get(userId) || [];
    const idx = cart.findIndex(i => i.productId === req.params.itemId);
    if (idx > -1) cart.splice(idx, 1);
    carts.set(userId, cart);
    res.status(200).json({ success: true, data: { cart } });
  }

  async checkout(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const cart = carts.get(userId) || [];
    if (cart.length === 0) { res.status(400).json({ success: false, error: { code: 'EMPTY_CART', message: 'Cart is empty', statusCode: 400 } }); return; }
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const order: Order = { id: `order_${Date.now().toString(36)}`, userId, items: [...cart], total, status: 'confirmed', createdAt: new Date().toISOString() };
    const userOrders = orders.get(userId) || [];
    userOrders.push(order);
    orders.set(userId, userOrders);
    carts.set(userId, []);
    res.status(201).json({ success: true, data: { order } });
  }

  async addToWishlist(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const body = req.body as any;
    const wl = wishlists.get(userId) || [];
    if (!wl.includes(body.productId)) wl.push(body.productId);
    wishlists.set(userId, wl);
    res.status(200).json({ success: true, data: { wishlist: wl } });
  }

  async getWishlist(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const wl = wishlists.get(userId) || [];
    res.status(200).json({ success: true, data: { wishlist: wl } });
  }

  async addReview(req: Request, res: Response): Promise<void> {
    const body = req.body as any;
    res.status(201).json({ success: true, data: { review: { id: `rev_${Date.now().toString(36)}`, productId: req.params.id, userId: req.userId, rating: body.rating, text: body.text, createdAt: new Date().toISOString() } } });
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    const userId = req.userId || '';
    const userOrders = orders.get(userId) || [];
    res.status(200).json({ success: true, data: { orders: userOrders } });
  }
}

export const shoppingController = new ShoppingController();
