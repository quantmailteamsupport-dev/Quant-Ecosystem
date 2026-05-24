// ============================================================================
// QuantNeon - Camera Page with AR Filters
// ============================================================================

import type { ARFilter } from '../types';

interface CameraPageProps { filters: ARFilter[]; selectedFilter: ARFilter | null; isRecording: boolean; mode: 'photo' | 'video' | 'story' | 'reel'; }

export function CameraPage({ filters, selectedFilter, isRecording, mode }: CameraPageProps) {
  return {
    type: 'div', props: { className: 'camera-page fullscreen' }, children: [
      { type: 'div', props: { className: 'camera-viewport' }, children: [
        { type: 'div', props: { className: 'camera-feed' }, children: [] },
        selectedFilter ? { type: 'div', props: { className: 'filter-overlay', 'data-filter': selectedFilter.id }, children: [] } : null,
      ].filter(Boolean) },
      { type: 'div', props: { className: 'camera-controls' }, children: [
        { type: 'div', props: { className: 'mode-selector' }, children: [
          { type: 'button', props: { className: mode === 'photo' ? 'active' : '' }, children: ['Photo'] },
          { type: 'button', props: { className: mode === 'video' ? 'active' : '' }, children: ['Video'] },
          { type: 'button', props: { className: mode === 'story' ? 'active' : '' }, children: ['Story'] },
          { type: 'button', props: { className: mode === 'reel' ? 'active' : '' }, children: ['Reel'] },
        ]},
        { type: 'button', props: { className: `capture-btn ${isRecording ? 'recording' : ''}` }, children: [isRecording ? 'Stop' : 'Capture'] },
        { type: 'button', props: { className: 'flip-btn' }, children: ['Flip'] },
      ]},
      { type: 'div', props: { className: 'filter-carousel' }, children: filters.map(f => ({ type: 'div', props: { className: `filter-item ${selectedFilter?.id === f.id ? 'selected' : ''}`, 'data-id': f.id }, children: [{ type: 'img', props: { src: f.thumbnailUrl, alt: f.name }, children: [] }, { type: 'span', props: {}, children: [f.name] }] })) },
    ],
  };
}
export default CameraPage;
