// ============================================================================
// QuantNeon - ShoppingCard Component (product card with purchase)
// ============================================================================

import type { Product } from '../types';

interface ShoppingCardProps { product: Product; onAddToCart: (productId: string) => void; onWishlist: (productId: string) => void; }

export function ShoppingCard({ product, onAddToCart, onWishlist }: ShoppingCardProps) {
  return {
    type: 'div', props: { className: 'shopping-card', 'data-id': product.id }, children: [
      { type: 'div', props: { className: 'product-image' }, children: [
        { type: 'img', props: { src: product.images[0] || '', alt: product.name, loading: 'lazy' }, children: [] },
        !product.inStock ? { type: 'span', props: { className: 'out-of-stock' }, children: ['Out of Stock'] } : null,
        { type: 'button', props: { className: 'wishlist-btn' }, children: ['Heart'] },
      ].filter(Boolean) },
      { type: 'div', props: { className: 'product-info' }, children: [
        { type: 'h3', props: {}, children: [product.name] },
        { type: 'p', props: { className: 'price' }, children: [`${product.currency} ${product.price.toFixed(2)}`] },
        { type: 'div', props: { className: 'rating' }, children: [{ type: 'span', props: {}, children: [`${product.rating}/5 (${product.reviewCount})`] }] },
        product.inStock ? { type: 'button', props: { className: 'add-cart-btn' }, children: ['Add to Cart'] } : null,
      ].filter(Boolean) },
    ],
  };
}
export default ShoppingCard;
