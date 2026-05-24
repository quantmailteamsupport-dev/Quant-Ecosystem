// ============================================================================
// QuantSync - Post Composer Page
// Rich post editor with media, polls, threads support
// ============================================================================

import type { PostType, MediaAttachment } from '../types';

interface ComposePageState {
  content: string;
  postType: PostType;
  mediaAttachments: MediaAttachment[];
  poll: { question: string; options: string[]; endsAt: string; isMultiple: boolean } | null;
  threadPosts: { content: string; media: MediaAttachment[] }[];
  communityId: string | null;
  isAnonymous: boolean;
  hashtags: string[];
  isSubmitting: boolean;
  charCount: number;
  maxChars: number;
}

export function ComposePage() {
  const state: ComposePageState = {
    content: '',
    postType: 'text',
    mediaAttachments: [],
    poll: null,
    threadPosts: [],
    communityId: null,
    isAnonymous: false,
    hashtags: [],
    isSubmitting: false,
    charCount: 0,
    maxChars: 5000,
  };

  function updateContent(text: string): void {
    state.content = text;
    state.charCount = text.length;
    // Auto-detect hashtags
    const tags = text.match(/#(\w+)/g) || [];
    state.hashtags = tags.map(t => t.substring(1).toLowerCase());
  }

  function addPoll(): void {
    state.postType = 'poll';
    state.poll = { question: '', options: ['', ''], endsAt: '', isMultiple: false };
  }

  function addThreadPost(): void {
    state.postType = 'thread';
    state.threadPosts.push({ content: '', media: [] });
  }

  function toggleAnonymous(): void {
    state.isAnonymous = !state.isAnonymous;
  }

  async function submit(): Promise<void> {
    if (!state.content && state.mediaAttachments.length === 0 && !state.poll) return;
    state.isSubmitting = true;
    // API call: quantSyncAPI.createPost(...)
    state.isSubmitting = false;
  }

  return {
    type: 'ComposePage',
    layout: 'centered',
    components: {
      composer: {
        type: 'PostComposer',
        props: {
          content: state.content,
          onContentChange: updateContent,
          charCount: state.charCount,
          maxChars: state.maxChars,
          postType: state.postType,
          poll: state.poll,
          threadPosts: state.threadPosts,
          isAnonymous: state.isAnonymous,
          onAddPoll: addPoll,
          onAddThread: addThreadPost,
          onToggleAnonymous: toggleAnonymous,
          onSubmit: submit,
          isSubmitting: state.isSubmitting,
        },
      },
      aiSuggestions: {
        type: 'AISuggestionPanel',
        props: { content: state.content },
      },
    },
  };
}

export default ComposePage;
