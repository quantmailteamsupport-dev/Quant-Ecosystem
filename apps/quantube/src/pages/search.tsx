// ============================================================================
// QuantTube - Search Page
// Search results with filters for videos, music, shows, channels
// ============================================================================

import type { SearchResult } from '../types';

interface SearchPageProps {
  query: string;
  results: SearchResult[];
  total: number;
  activeFilter: string;
  suggestions: string[];
}

export function SearchPage({ query, results, total, activeFilter, suggestions }: SearchPageProps) {
  return {
    type: 'div',
    props: { className: 'search-page' },
    children: [
      { type: 'div', props: { className: 'search-bar' }, children: [
        { type: 'input', props: { type: 'text', value: query, placeholder: 'Search videos, music, shows...' }, children: [] },
        { type: 'button', props: { className: 'voice-search-btn' }, children: ['Voice'] },
      ]},
      suggestions.length > 0 ? { type: 'div', props: { className: 'suggestions' }, children: suggestions.map(s => ({ type: 'span', props: { className: 'suggestion' }, children: [s] })) } : null,
      { type: 'div', props: { className: 'search-filters' }, children: [
        { type: 'button', props: { className: `filter ${activeFilter === 'all' ? 'active' : ''}` }, children: ['All'] },
        { type: 'button', props: { className: `filter ${activeFilter === 'video' ? 'active' : ''}` }, children: ['Videos'] },
        { type: 'button', props: { className: `filter ${activeFilter === 'music' ? 'active' : ''}` }, children: ['Music'] },
        { type: 'button', props: { className: `filter ${activeFilter === 'show' ? 'active' : ''}` }, children: ['Shows'] },
        { type: 'button', props: { className: `filter ${activeFilter === 'channel' ? 'active' : ''}` }, children: ['Channels'] },
      ]},
      { type: 'p', props: { className: 'result-count' }, children: [`${total} results for "${query}"`] },
      { type: 'div', props: { className: 'results-list' }, children: results.map(r => ({
        type: 'div', props: { className: `result-card result-card--${r.type}` }, children: [
          { type: 'img', props: { src: r.thumbnailUrl, className: 'result-thumb' }, children: [] },
          { type: 'div', props: { className: 'result-info' }, children: [
            { type: 'h3', props: {}, children: [r.title] },
            { type: 'p', props: {}, children: [r.description] },
            { type: 'span', props: { className: 'result-type' }, children: [r.type] },
          ]},
        ],
      }))},
    ].filter(Boolean),
  };
}

export default SearchPage;
