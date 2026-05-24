// ============================================================================
// QuantNeon - Explore Page
// Explore/discover grid with categories and search
// ============================================================================

import type { Post, ExploreCategory } from '../types';

interface ExplorePageProps {
  posts: Post[];
  categories: ExploreCategory[];
  trending: { tag: string; postCount: number }[];
  searchQuery: string;
}

export function ExplorePage({ posts, categories, trending, searchQuery }: ExplorePageProps) {
  return {
    type: 'div',
    props: { className: 'explore-page' },
    children: [
      { type: 'div', props: { className: 'search-bar' }, children: [
        { type: 'input', props: { type: 'text', placeholder: 'Search', value: searchQuery, className: 'search-input' }, children: [] },
      ]},
      { type: 'div', props: { className: 'category-scroll' }, children: categories.map(cat => ({
        type: 'button', props: { className: 'category-chip' }, children: [cat.name],
      }))},
      { type: 'div', props: { className: 'explore-grid' }, children: posts.map((post, i) => ({
        type: 'div', props: { className: `explore-item ${i % 5 === 0 ? 'large' : ''}`, 'data-id': post.id }, children: [
          { type: 'img', props: { src: post.media[0]?.url || '', alt: '', loading: 'lazy' }, children: [] },
          post.type === 'video' ? { type: 'span', props: { className: 'reel-icon' }, children: ['Reel'] } : null,
        ].filter(Boolean),
      }))},
    ],
  };
}

export default ExplorePage;
