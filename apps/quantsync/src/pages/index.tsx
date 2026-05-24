// ============================================================================
// QuantSync - Main Feed Page
// For-you / Following / Anonymous feed with mode switching
// ============================================================================

import type { Post, FeedMode } from '../types';

interface FeedPageProps {
  initialPosts?: Post[];
  initialMode?: FeedMode;
}

interface FeedPageState {
  posts: Post[];
  mode: FeedMode;
  isLoading: boolean;
  hasMore: boolean;
  cursor?: string;
}

export function FeedPage({ initialPosts = [], initialMode = 'for-you' }: FeedPageProps) {
  const state: FeedPageState = {
    posts: initialPosts,
    mode: initialMode,
    isLoading: false,
    hasMore: true,
  };

  async function loadFeed(mode: FeedMode, cursor?: string): Promise<void> {
    state.isLoading = true;
    state.mode = mode;
    // API call would go here: quantSyncAPI.getFeed(mode, cursor)
    state.isLoading = false;
  }

  async function loadMore(): Promise<void> {
    if (!state.hasMore || state.isLoading) return;
    await loadFeed(state.mode, state.cursor);
  }

  function switchMode(mode: FeedMode): void {
    state.posts = [];
    state.cursor = undefined;
    loadFeed(mode);
  }

  return {
    type: 'FeedPage',
    layout: 'three-column',
    components: {
      header: {
        type: 'FeedToggle',
        props: { activeMode: state.mode, onModeChange: switchMode },
      },
      main: {
        type: 'PostFeed',
        props: {
          posts: state.posts,
          isLoading: state.isLoading,
          onLoadMore: loadMore,
          onPostClick: (postId: string) => `/post/${postId}`,
        },
      },
      sidebar: {
        type: 'TrendingSidebar',
        props: {},
      },
      fab: {
        type: 'ComposeButton',
        props: { href: '/compose' },
      },
    },
  };
}

export default FeedPage;
