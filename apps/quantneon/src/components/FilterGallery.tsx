// ============================================================================
// QuantNeon - FilterGallery Component (photo/video filter gallery)
// ============================================================================

interface FilterItem { name: string; thumbnailUrl: string; category: string; }

interface FilterGalleryProps { filters: FilterItem[]; selectedFilter: string | null; previewUrl: string; onSelect: (name: string) => void; }

export function FilterGallery({ filters, selectedFilter, previewUrl }: FilterGalleryProps) {
  return {
    type: 'div', props: { className: 'filter-gallery' }, children: [
      { type: 'div', props: { className: 'filter-preview' }, children: [{ type: 'img', props: { src: previewUrl, className: 'preview-image' }, children: [] }, selectedFilter ? { type: 'span', props: { className: 'active-filter' }, children: [selectedFilter] } : null].filter(Boolean) },
      { type: 'div', props: { className: 'filter-list' }, children: [
        { type: 'div', props: { className: `filter-option ${!selectedFilter ? 'selected' : ''}` }, children: [{ type: 'span', props: {}, children: ['Original'] }] },
        ...filters.map(f => ({ type: 'div', props: { className: `filter-option ${selectedFilter === f.name ? 'selected' : ''}`, 'data-filter': f.name }, children: [{ type: 'img', props: { src: f.thumbnailUrl, alt: f.name }, children: [] }, { type: 'span', props: {}, children: [f.name] }] })),
      ]},
    ],
  };
}
export default FilterGallery;
