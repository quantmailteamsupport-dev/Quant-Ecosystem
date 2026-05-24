// ============================================================================
// QuantSync - Single Post Page
// Post detail with full comment thread
// ============================================================================

import type { Post, Comment } from '../../types';

interface PostPageProps {
  postId: string;
}

interface PostPageState {
  post: Post | null;
  comments: Comment[];
  commentSort: 'best' | 'new' | 'controversial';
  isLoading: boolean;
  replyingTo: string | null;
}

export function PostPage({ postId }: PostPageProps) {
  const state: PostPageState = {
    post: null,
    comments: [],
    commentSort: 'best',
    isLoading: true,
    replyingTo: null,
  };

  async function loadPost(): Promise<void> {
    state.isLoading = true;
    // API call: quantSyncAPI.getPost(postId)
    // API call: quantSyncAPI.getComments(postId, state.commentSort)
    state.isLoading = false;
  }

  async function submitComment(content: string, parentId?: string): Promise<void> {
    // API call: quantSyncAPI.createComment(postId, content, parentId)
    state.replyingTo = null;
  }

  async function vote(direction: 'up' | 'down'): Promise<void> {
    // API call: quantSyncAPI.upvote(postId) or quantSyncAPI.downvote(postId)
  }

  return {
    type: 'PostPage',
    layout: 'two-column',
    components: {
      main: [
        {
          type: 'PostCard',
          props: { post: state.post, expanded: true, onVote: vote },
        },
        {
          type: 'CommentComposer',
          props: { onSubmit: submitComment, placeholder: 'Add a comment...' },
        },
        {
          type: 'CommentSortSelector',
          props: { value: state.commentSort, onChange: (sort: string) => { state.commentSort = sort as any; } },
        },
        {
          type: 'CommentThread',
          props: { comments: state.comments, onReply: (id: string) => { state.replyingTo = id; } },
        },
      ],
      sidebar: { type: 'TrendingSidebar', props: {} },
    },
  };
}

export default PostPage;
