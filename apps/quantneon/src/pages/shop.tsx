// ============================================================================
// QuantNeon - Shopping Page
// ============================================================================

import type { Product } from '../types';

interface ShopPageProps { products: Product[]; categories: string[]; featured: Product[]; }

export function ShopPage({ products, categories, featured }: ShopPageProps) {
  return {
    type: 'div', props: { className: 'shop-page' }, children: [
      { type: 'header', props: {}, children: [{ type: 'h1', props: {}, children: ['Shop'] }, { type: 'button', props: { className: 'cart-btn' }, children: ['Cart'] }] },
      { type: 'div', props: { className: 'shop-categories' }, children: categories.map(c => ({ type: 'button', props: { className: 'cat-chip' }, children: [c] })) },
      { type: 'section', props: { className: 'featured-products' }, children: [{ type: 'h2', props: {}, children: ['Featured'] }, { type: 'div', props: { className: 'product-grid' }, children: featured.map(p => renderProductCard(p)) }] },
      { type: 'section', props: { className: 'all-products' }, children: [{ type: 'h2', props: {}, children: ['All Products'] }, { type: 'div', props: { className: 'product-grid' }, children: products.map(p => renderProductCard(p)) }] },
    ],
  };
}

function renderProductCard(product: Product) {
  return { type: 'div', props: { className: 'product-card', 'data-id': product.id }, children: [{ type: 'img', props: { src: product.images[0] || '' }, children: [] }, { type: 'h3', props: {}, children: [product.name] }, { type: 'span', props: { className: 'price' }, children: [`$${product.price.toFixed(2)}`] }, { type: 'span', props: { className: 'rating' }, children: [`${product.rating}/5`] }] };
}

export default ShopPage;
