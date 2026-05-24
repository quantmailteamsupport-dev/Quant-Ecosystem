// ============================================================================
// QuantSync - Search Results Page
// Full search with filters and categories
// ============================================================================

import type { SearchResult } from '../types';

interface SearchPageState {
  query: string;
  results: SearchResult[];
  activeFilter: 'all' | 'posts' | 'users' | 'communities' | 'hashtags';
  sortBy: 'relevance' | 'recent' | 'popular';
  isLoading: boolean;
}

export function SearchPage() {
  const state: SearchPageState = {
    query: '',
    results: [],
    activeFilter: 'all',
    sortBy: 'relevance',
    isLoading: false,
  };

  async function performSearch(query: string): Promise<void> {
    state.query = query;
    state.isLoading = true;
    // API call: quantSyncAPI.search(query, state.activeFilter, state.sortBy)
    state.isLoading = false;
  }

  return {
    type: 'SearchPage',
    layout: 'two-column',
    components: {
      searchBar: { type: 'SearchInput', props: { value: state.query, onSearch: performSearch, autoFocus: true } },
      filters: { type: 'SearchFilters', props: { active: state.activeFilter, sortBy: state.sortBy } },
      results: { type: 'SearchResults', props: { results: state.results, isLoading: state.isLoading } },
      sidebar: { type: 'TrendingSidebar', props: {} },
    },
  };
}

export default SearchPage;
