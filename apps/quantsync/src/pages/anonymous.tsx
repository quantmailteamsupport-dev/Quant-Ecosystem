// ============================================================================
// QuantSync - Anonymous Feed Page
// Anonymous posting and confessions
// ============================================================================

import type { Post } from '../types';

interface AnonymousPageState {
  posts: Post[];
  categories: string[];
  activeCategory: string;
  sortBy: 'hot' | 'new' | 'top';
  isLoading: boolean;
}

export function AnonymousPage() {
  const state: AnonymousPageState = {
    posts: [],
    categories: ['all', 'relationship', 'work', 'school', 'family', 'secret', 'confession', 'funny', 'rant', 'advice'],
    activeCategory: 'all',
    sortBy: 'hot',
    isLoading: true,
  };

  async function loadFeed(category?: string, sort?: string): Promise<void> {
    state.isLoading = true;
    state.activeCategory = category || 'all';
    // API call: quantSyncAPI.getAnonymousFeed(sort, category)
    state.isLoading = false;
  }

  return {
    type: 'AnonymousPage',
    layout: 'two-column',
    components: {
      header: {
        type: 'AnonymousHeader',
        props: { title: 'Anonymous', subtitle: 'Share freely. Your identity is hidden.' },
      },
      categories: { type: 'CategoryChips', props: { items: state.categories, active: state.activeCategory, onChange: (c: string) => loadFeed(c) } },
      compose: { type: 'AnonymousComposer', props: { categories: state.categories } },
      feed: { type: 'AnonymousFeed', props: { posts: state.posts, isLoading: state.isLoading, sortBy: state.sortBy } },
    },
  };
}

export default AnonymousPage;
