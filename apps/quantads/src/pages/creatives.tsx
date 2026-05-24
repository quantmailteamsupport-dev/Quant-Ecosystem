// ============================================================================
// QuantAds - Creatives Page
// Creative library and builder
// ============================================================================

import type { Creative, CreativeFormat } from '../types';

interface CreativesPageState {
  creatives: Creative[];
  formatFilter: CreativeFormat | 'all';
  isLoading: boolean;
}

export function CreativesPage() {
  const state: CreativesPageState = {
    creatives: [],
    formatFilter: 'all',
    isLoading: true,
  };

  return {
    type: 'CreativesPage',
    layout: 'full-width',
    components: {
      header: { type: 'PageHeader', props: { title: 'Creatives', action: { label: 'New Creative', href: '/creatives/new' } } },
      filters: { type: 'FormatFilter', props: { formats: ['all', 'image', 'video', 'carousel', 'interactive', 'native'], active: state.formatFilter } },
      grid: { type: 'CreativeGrid', props: { creatives: state.creatives, isLoading: state.isLoading } },
    },
  };
}

export default CreativesPage;
