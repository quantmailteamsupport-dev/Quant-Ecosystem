// ============================================================================
// QuantSync - CommentThread Component
// Nested comment thread with collapsible replies
// ============================================================================

import type { Comment } from '../types';

interface CommentThreadProps {
  comments: Comment[];
  onReply?: (commentId: string) => void;
  onVote?: (commentId: string, direction: 'up' | 'down') => void;
  onCollapse?: (commentId: string) => void;
  maxDepth?: number;
}

export function CommentThread({ comments, onReply, onVote, onCollapse, maxDepth = 8 }: CommentThreadProps) {
  function renderComment(comment: Comment, depth: number) {
    const isCollapsed = comment.collapsed;
    const canExpand = comment.replyCount > 0;
    const atMaxDepth = depth >= maxDepth;

    return {
      type: 'div',
      className: `comment-node depth-${depth} ${isCollapsed ? 'collapsed' : ''}`,
      key: comment.id,
      children: [
        // Collapse line
        depth > 0 && {
          type: 'div',
          className: 'thread-line',
          onClick: () => onCollapse?.(comment.id),
        },
        // Comment body
        {
          type: 'div',
          className: 'comment-body',
          children: [
            // Header
            {
              type: 'div',
              className: 'comment-header',
              children: [
                { type: 'span', className: `author ${comment.isOP ? 'op' : ''} ${comment.isModerator ? 'mod' : ''}`, text: comment.isAnonymous ? comment.anonymousAlias : comment.author?.username },
                comment.isOP && { type: 'span', className: 'op-badge', text: 'OP' },
                comment.isModerator && { type: 'span', className: 'mod-badge', text: 'MOD' },
                { type: 'span', className: 'score', text: `${comment.score} points` },
                { type: 'span', className: 'time', text: getTimeAgo(comment.createdAt) },
                comment.isEdited && { type: 'span', className: 'edited', text: '(edited)' },
              ].filter(Boolean),
            },
            // Content (hidden if collapsed)
            !isCollapsed && {
              type: 'div',
              className: 'comment-content',
              children: [
                { type: 'p', text: comment.content },
                comment.mediaAttachments.length > 0 && {
                  type: 'div',
                  className: 'comment-media',
                  children: comment.mediaAttachments.map(m => ({ type: 'img', src: m.url, alt: m.altText || '' })),
                },
              ].filter(Boolean),
            },
            // Actions
            !isCollapsed && {
              type: 'div',
              className: 'comment-actions',
              children: [
                { type: 'button', className: `upvote ${comment.userVote === 'up' ? 'active' : ''}`, onClick: () => onVote?.(comment.id, 'up'), text: 'Upvote' },
                { type: 'button', className: `downvote ${comment.userVote === 'down' ? 'active' : ''}`, onClick: () => onVote?.(comment.id, 'down'), text: 'Downvote' },
                !atMaxDepth && { type: 'button', className: 'reply-btn', onClick: () => onReply?.(comment.id), text: 'Reply' },
                canExpand && isCollapsed && { type: 'button', className: 'expand-btn', onClick: () => onCollapse?.(comment.id), text: `[+] ${comment.replyCount} replies` },
              ].filter(Boolean),
            },
            // Nested replies
            !isCollapsed && comment.replies && comment.replies.length > 0 && !atMaxDepth && {
              type: 'div',
              className: 'replies',
              children: comment.replies.map(reply => renderComment(reply, depth + 1)),
            },
            // "Continue thread" link at max depth
            atMaxDepth && comment.replyCount > 0 && {
              type: 'a',
              className: 'continue-thread',
              text: `Continue this thread (${comment.replyCount} more)`,
              href: `/post/${comment.postId}?comment=${comment.id}`,
            },
          ].filter(Boolean),
        },
      ].filter(Boolean),
    };
  }

  return {
    type: 'div',
    className: 'comment-thread',
    children: comments.map(comment => renderComment(comment, 0)),
  };
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default CommentThread;
