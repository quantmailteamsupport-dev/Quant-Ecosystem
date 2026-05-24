// ============================================================================
// QuantNeon - ExploreGrid Component
// ============================================================================

interface ExploreItem { id: string; thumbnailUrl: string; type: 'post' | 'reel' | 'product'; likes?: number; }

interface ExploreGridProps { items: ExploreItem[]; onItemClick?: (id: string) => void; }

export function ExploreGrid({ items }: ExploreGridProps) {
  return {
    type: 'div', props: { className: 'explore-grid' }, children: items.map((item, i) => ({
      type: 'div', props: { className: `explore-cell ${i % 9 === 0 || i % 9 === 4 ? 'large' : ''}`, 'data-id': item.id }, children: [
        { type: 'img', props: { src: item.thumbnailUrl, alt: '', loading: 'lazy' }, children: [] },
        item.type === 'reel' ? { type: 'span', props: { className: 'reel-badge' }, children: ['Reel'] } : null,
        item.type === 'product' ? { type: 'span', props: { className: 'shop-badge' }, children: ['Shop'] } : null,
      ].filter(Boolean),
    })),
  };
}
export default ExploreGrid;
