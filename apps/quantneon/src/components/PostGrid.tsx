// ============================================================================
// QuantNeon - PostGrid Component (Instagram-style photo grid)
// ============================================================================

import type { Post } from '../types';

interface PostGridProps { posts: Post[]; columns?: number; onPostClick?: (id: string) => void; }

export function PostGrid({ posts, columns = 3 }: PostGridProps) {
  return { type: 'div', props: { className: 'post-grid', style: `grid-template-columns: repeat(${columns}, 1fr)` }, children: posts.map(post => ({ type: 'div', props: { className: `grid-item ${post.type === 'carousel' ? 'carousel' : ''} ${post.type === 'video' ? 'video' : ''}`, 'data-id': post.id }, children: [{ type: 'img', props: { src: post.media[0]?.url || '', alt: post.caption.substring(0, 50), loading: 'lazy' }, children: [] }, { type: 'div', props: { className: 'grid-overlay' }, children: [{ type: 'span', props: {}, children: [`${post.likes}`] }, { type: 'span', props: {}, children: [`${post.commentCount}`] }] }] })) };
}
export default PostGrid;
