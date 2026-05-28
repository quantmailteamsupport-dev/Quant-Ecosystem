'use client';

import { useState } from 'react';
import { Avatar, Button, Input } from '@quant/shared-ui';

interface Comment {
  id: string;
  author: string;
  avatarUrl?: string;
  text: string;
  timestamp: string;
  replies?: Comment[];
}

interface CommentsPanelProps {
  comments?: Comment[];
  onAddComment?: (text: string) => void;
  onReply?: (commentId: string, text: string) => void;
}

export function CommentsPanel({ comments = [], onAddComment, onReply }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <aside
      className="w-72 lg:w-80 border-l border-[var(--quant-border)] flex flex-col h-full bg-[var(--quant-background)]"
      aria-label="Comments panel"
    >
      <div className="p-3 border-b border-[var(--quant-border)]">
        <h2 className="text-sm font-semibold">Comments</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--quant-muted-foreground)] text-center py-8">
            No comments yet
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onReply={onReply} />
          ))
        )}
      </div>

      <div className="p-3 border-t border-[var(--quant-border)]">
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            aria-label="Add a comment"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!newComment.trim()}>
            Post
          </Button>
        </div>
      </div>
    </aside>
  );
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: Comment;
  onReply?: (commentId: string, text: string) => void;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (replyText.trim() && onReply) {
      onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  return (
    <article className="space-y-2">
      <div className="flex items-start gap-2">
        <Avatar src={comment.avatarUrl} name={comment.author} size="xs" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium truncate">{comment.author}</span>
            <time className="text-xs text-[var(--quant-muted-foreground)]">
              {new Date(comment.timestamp).toLocaleDateString()}
            </time>
          </div>
          <p className="text-sm mt-0.5">{comment.text}</p>
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="text-xs text-quant-primary hover:underline mt-1"
            aria-label={`Reply to ${comment.author}`}
          >
            Reply
          </button>
        </div>
      </div>

      {showReplyInput && (
        <div className="ml-8 flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            aria-label="Write a reply"
          />
          <Button variant="ghost" size="sm" onClick={handleReply} disabled={!replyText.trim()}>
            Send
          </Button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} />
          ))}
        </div>
      )}
    </article>
  );
}
