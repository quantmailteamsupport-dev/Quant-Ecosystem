// ============================================================================
// QuantTube - Recommendations Component
// AI recommendation sidebar with personalized content suggestions
// ============================================================================

import type { Recommendation } from '../types';

interface RecommendationsProps {
  recommendations: Recommendation[];
  title: string;
  loading: boolean;
  onItemClick: (contentId: string) => void;
  onRefresh: () => void;
}

export function Recommendations({ recommendations, title, loading, onItemClick, onRefresh }: RecommendationsProps) {
  if (loading) {
    return { type: 'div', props: { className: 'recommendations loading' }, children: Array.from({ length: 5 }, (_, i) => ({ type: 'div', props: { className: 'rec-skeleton', key: i }, children: [] })) };
  }

  return {
    type: 'aside',
    props: { className: 'recommendations-panel' },
    children: [
      { type: 'div', props: { className: 'rec-header' }, children: [
        { type: 'h3', props: {}, children: [title] },
        { type: 'button', props: { className: 'refresh-btn' }, children: ['Refresh'] },
      ]},
      { type: 'div', props: { className: 'rec-list' }, children: recommendations.map(rec => ({
        type: 'div',
        props: { className: `rec-item rec-item--${rec.contentType}`, 'data-id': rec.contentId, 'data-score': rec.score.toFixed(3) },
        children: [
          { type: 'div', props: { className: 'rec-thumb' }, children: [] },
          { type: 'div', props: { className: 'rec-info' }, children: [
            { type: 'p', props: { className: 'rec-title' }, children: [rec.contentId] },
            { type: 'span', props: { className: 'rec-reason' }, children: [rec.reason] },
            { type: 'span', props: { className: 'rec-type-badge' }, children: [rec.contentType] },
          ]},
        ],
      }))},
    ],
  };
}

export default Recommendations;
