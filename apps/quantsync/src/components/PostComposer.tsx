// ============================================================================
// QuantSync - PostComposer Component
// Rich post editor with media, polls, threads
// ============================================================================

import type { PostType, MediaAttachment } from '../types';

interface PostComposerProps {
  content: string;
  onContentChange: (text: string) => void;
  charCount: number;
  maxChars: number;
  postType: PostType;
  isAnonymous: boolean;
  onAddPoll: () => void;
  onAddThread: () => void;
  onToggleAnonymous: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  poll?: { question: string; options: string[]; endsAt: string; isMultiple: boolean } | null;
  threadPosts?: { content: string; media: MediaAttachment[] }[];
}

export function PostComposer(props: PostComposerProps) {
  const charRemaining = props.maxChars - props.charCount;
  const canSubmit = props.content.length > 0 || props.poll;
  const charWarning = charRemaining < 100;

  return {
    type: 'div',
    className: 'post-composer',
    children: [
      // Composer header
      {
        type: 'div',
        className: 'composer-header',
        children: [
          props.isAnonymous && { type: 'div', className: 'anonymous-badge', text: 'Posting anonymously' },
        ].filter(Boolean),
      },
      // Text area
      {
        type: 'textarea',
        className: 'composer-input',
        placeholder: props.isAnonymous ? 'Share anonymously...' : 'What is on your mind?',
        value: props.content,
        onChange: (e: any) => props.onContentChange(e.target.value),
        maxLength: props.maxChars,
      },
      // Poll editor
      props.poll && {
        type: 'div',
        className: 'poll-editor',
        children: [
          { type: 'input', placeholder: 'Ask a question...', value: props.poll.question },
          ...props.poll.options.map((opt, i) => ({
            type: 'input',
            className: 'poll-option-input',
            placeholder: `Option ${i + 1}`,
            value: opt,
          })),
          { type: 'button', className: 'add-option', text: '+ Add option' },
        ],
      },
      // Thread posts
      props.threadPosts && props.threadPosts.length > 0 && {
        type: 'div',
        className: 'thread-editor',
        children: props.threadPosts.map((tp, i) => ({
          type: 'div',
          className: 'thread-post-editor',
          children: [
            { type: 'span', className: 'thread-number', text: `${i + 2}` },
            { type: 'textarea', placeholder: 'Continue thread...', value: tp.content },
          ],
        })),
      },
      // Toolbar
      {
        type: 'div',
        className: 'composer-toolbar',
        children: [
          { type: 'button', className: 'tool-btn media', title: 'Add media', text: 'Media' },
          { type: 'button', className: 'tool-btn poll', title: 'Add poll', onClick: props.onAddPoll, text: 'Poll' },
          { type: 'button', className: 'tool-btn thread', title: 'Add to thread', onClick: props.onAddThread, text: 'Thread' },
          { type: 'button', className: 'tool-btn gif', title: 'Add GIF', text: 'GIF' },
          { type: 'button', className: `tool-btn anonymous ${props.isAnonymous ? 'active' : ''}`, onClick: props.onToggleAnonymous, text: 'Anonymous' },
        ],
      },
      // Footer
      {
        type: 'div',
        className: 'composer-footer',
        children: [
          { type: 'span', className: `char-count ${charWarning ? 'warning' : ''}`, text: `${charRemaining}` },
          { type: 'button', className: 'submit-btn', disabled: !canSubmit || props.isSubmitting, onClick: props.onSubmit, text: props.isSubmitting ? 'Posting...' : 'Post' },
        ],
      },
    ].filter(Boolean),
  };
}

export default PostComposer;
