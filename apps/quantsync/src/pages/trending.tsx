// ============================================================================
// QuantSync - Trending Page
// Trending topics, hashtags, and explore
// ============================================================================

import type { TrendingTopic } from '../types';

interface TrendingPageState {
  topics: TrendingTopic[];
  categories: string[];
  activeCategory: string;
  isLoading: boolean;
}

export function TrendingPage() {
  const state: TrendingPageState = {
    topics: [],
    categories: ['all', 'technology', 'gaming', 'sports', 'entertainment', 'science', 'politics', 'finance'],
    activeCategory: 'all',
    isLoading: true,
  };

  async function loadTrending(category?: string): Promise<void> {
    state.isLoading = true;
    state.activeCategory = category || 'all';
    // API call: quantSyncAPI.getTrending(category)
    state.isLoading = false;
  }

  return {
    type: 'TrendingPage',
    layout: 'two-column',
    components: {
      header: { type: 'PageHeader', props: { title: 'Trending' } },
      categories: { type: 'CategoryChips', props: { items: state.categories, active: state.activeCategory, onChange: loadTrending } },
      topics: { type: 'TrendingList', props: { topics: state.topics, isLoading: state.isLoading } },
      sidebar: { type: 'ExploreWidget', props: {} },
    },
  };
}

export default TrendingPage;
