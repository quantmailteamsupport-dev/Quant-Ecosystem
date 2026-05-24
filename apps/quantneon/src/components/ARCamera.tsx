// ============================================================================
// QuantNeon - ARCamera Component
// ============================================================================

import type { ARFilter } from '../types';

interface ARCameraProps { activeFilter: ARFilter | null; filters: ARFilter[]; isRecording: boolean; facing: 'front' | 'back'; }

export function ARCamera({ activeFilter, filters, isRecording, facing }: ARCameraProps) {
  return {
    type: 'div', props: { className: 'ar-camera' }, children: [
      { type: 'div', props: { className: 'camera-view', 'data-facing': facing }, children: [
        activeFilter ? { type: 'div', props: { className: 'ar-overlay', 'data-filter': activeFilter.id }, children: [{ type: 'span', props: { className: 'filter-name' }, children: [activeFilter.name] }] } : null,
      ].filter(Boolean) },
      { type: 'div', props: { className: 'ar-controls' }, children: [
        { type: 'button', props: { className: 'flip-camera' }, children: ['Flip'] },
        { type: 'button', props: { className: `shutter ${isRecording ? 'recording' : ''}` }, children: [] },
        { type: 'button', props: { className: 'gallery' }, children: ['Gallery'] },
      ]},
      { type: 'div', props: { className: 'filter-strip' }, children: filters.slice(0, 8).map(f => ({ type: 'div', props: { className: `filter-thumb ${activeFilter?.id === f.id ? 'active' : ''}` }, children: [{ type: 'img', props: { src: f.thumbnailUrl, alt: f.name }, children: [] }] })) },
    ],
  };
}
export default ARCamera;
