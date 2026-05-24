// ============================================================================
// QuantSync - Community Discovery Page
// Browse and discover communities
// ============================================================================

import type { Community, CommunityCategory } from '../types';

interface CommunitiesPageState {
  communities: Community[];
  categories: CommunityCategory[];
  activeCategory: CommunityCategory | 'all';
  sortBy: 'popular' | 'new' | 'active';
  isLoading: boolean;
}

export function CommunitiesPage() {
  const state: CommunitiesPageState = {
    communities: [],
    categories: ['technology', 'gaming', 'science', 'art', 'music', 'sports', 'entertainment', 'news', 'memes'],
    activeCategory: 'all',
    sortBy: 'popular',
    isLoading: true,
  };

  async function loadCommunities(category?: CommunityCategory): Promise<void> {
    state.isLoading = true;
    // API call: quantSyncAPI.listCommunities({ category, sort: state.sortBy })
    state.isLoading = false;
  }

  return {
    type: 'CommunitiesPage',
    layout: 'full-width',
    components: {
      header: { type: 'PageHeader', props: { title: 'Communities', action: { label: 'Create Community', href: '/communities/create' } } },
      filters: { type: 'CategoryFilter', props: { categories: state.categories, active: state.activeCategory, onChange: loadCommunities } },
      grid: { type: 'CommunityGrid', props: { communities: state.communities, isLoading: state.isLoading } },
    },
  };
}

export default CommunitiesPage;
