// ============================================================================
// QuantAds - Audiences Page
// Audience builder and management
// ============================================================================

import type { CustomAudience } from '../types';

interface AudiencesPageState {
  audiences: CustomAudience[];
  isLoading: boolean;
}

export function AudiencesPage() {
  const state: AudiencesPageState = {
    audiences: [],
    isLoading: true,
  };

  return {
    type: 'AudiencesPage',
    layout: 'full-width',
    components: {
      header: { type: 'PageHeader', props: { title: 'Audiences', action: { label: 'Create Audience', href: '/audiences/new' } } },
      builder: { type: 'AudienceBuilder', props: {} },
      list: { type: 'AudienceList', props: { audiences: state.audiences, isLoading: state.isLoading } },
    },
  };
}

export default AudiencesPage;
