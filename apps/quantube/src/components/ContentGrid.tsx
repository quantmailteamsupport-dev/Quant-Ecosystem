// ============================================================================
// QuantTube - ContentGrid Component
// Responsive grid for videos/shows/music content cards
// ============================================================================

interface ContentItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration?: number;
  views?: number;
  channelName?: string;
  artistName?: string;
  type: 'video' | 'track' | 'show' | 'short';
}

interface ContentGridProps {
  items: ContentItem[];
  layout: 'grid' | 'list' | 'compact';
  columns?: number;
  onItemClick?: (id: string) => void;
}

export function ContentGrid({ items, layout, columns = 4 }: ContentGridProps) {
  return {
    type: 'div',
    props: { className: `content-grid content-grid--${layout}`, style: layout === 'grid' ? `grid-template-columns: repeat(${columns}, 1fr)` : '' },
    children: items.map(item => renderGridItem(item, layout)),
  };
}

function renderGridItem(item: ContentItem, layout: string) {
  if (layout === 'list') return renderListItem(item);
  return {
    type: 'div',
    props: { className: `grid-item grid-item--${item.type}`, 'data-id': item.id },
    children: [
      { type: 'div', props: { className: 'item-thumbnail' }, children: [
        { type: 'img', props: { src: item.thumbnailUrl, alt: item.title, loading: 'lazy' }, children: [] },
        item.duration ? { type: 'span', props: { className: 'duration-badge' }, children: [formatDuration(item.duration)] } : null,
        item.type === 'short' ? { type: 'span', props: { className: 'short-badge' }, children: ['SHORT'] } : null,
      ].filter(Boolean) },
      { type: 'div', props: { className: 'item-info' }, children: [
        { type: 'h3', props: { className: 'item-title' }, children: [item.title] },
        { type: 'p', props: { className: 'item-creator' }, children: [item.channelName || item.artistName || ''] },
        item.views !== undefined ? { type: 'p', props: { className: 'item-meta' }, children: [`${formatViews(item.views)} views`] } : null,
      ].filter(Boolean) },
    ],
  };
}

function renderListItem(item: ContentItem) {
  return {
    type: 'div',
    props: { className: 'list-item', 'data-id': item.id },
    children: [
      { type: 'img', props: { src: item.thumbnailUrl, className: 'list-thumb' }, children: [] },
      { type: 'div', props: { className: 'list-details' }, children: [
        { type: 'h3', props: {}, children: [item.title] },
        { type: 'p', props: {}, children: [item.channelName || item.artistName || ''] },
        { type: 'span', props: {}, children: [item.views !== undefined ? `${formatViews(item.views)} views` : ''] },
      ]},
      item.duration ? { type: 'span', props: { className: 'list-duration' }, children: [formatDuration(item.duration)] } : null,
    ].filter(Boolean),
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

export default ContentGrid;
