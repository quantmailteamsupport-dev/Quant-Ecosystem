// ============================================================================
// QuantSync - TrendingSidebar Component
// Trending topics sidebar widget
// ============================================================================

import type { TrendingTopic } from '../types';

interface TrendingSidebarProps {
  topics?: TrendingTopic[];
  maxItems?: number;
}

export function TrendingSidebar({ topics = [], maxItems = 10 }: TrendingSidebarProps) {
  const displayTopics = topics.slice(0, maxItems);

  return {
    type: 'aside',
    className: 'trending-sidebar',
    children: [
      { type: 'h3', className: 'sidebar-title', text: 'Trending' },
      {
        type: 'ul',
        className: 'trending-list',
        children: displayTopics.map((topic, index) => ({
          type: 'li',
          className: 'trending-item',
          children: [
            { type: 'span', className: 'trending-rank', text: `${index + 1}` },
            {
              type: 'div',
              className: 'trending-info',
              children: [
                { type: 'span', className: 'trending-category', text: topic.category },
                { type: 'a', className: 'trending-hashtag', href: `/hashtag/${topic.name}`, text: topic.hashtag },
                { type: 'span', className: 'trending-posts', text: `${formatCount(topic.postCount)} posts` },
              ],
            },
            topic.velocity > 2 && { type: 'span', className: 'trending-hot', text: 'Hot' },
          ].filter(Boolean),
        })),
      },
      { type: 'a', className: 'show-more', href: '/trending', text: 'Show more' },
    ],
  };
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export default TrendingSidebar;
