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

export function PostComposer({
  content,
  onContentChange,
  charCount,
  maxChars,
  postType: _postType,
  isAnonymous,
  onAddPoll,
  onAddThread,
  onToggleAnonymous,
  onSubmit,
  isSubmitting,
  poll,
  threadPosts,
}: PostComposerProps) {
  const charRemaining = maxChars - charCount;
  const canSubmit = content.length > 0 || poll;
  const charWarning = charRemaining < 100;

  return (
    <div
      className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm"
      role="form"
      aria-label="Post composer"
    >
      {/* Composer header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
        {isAnonymous && (
          <div className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
            Posting anonymously
          </div>
        )}
      </div>

      {/* Text area */}
      <textarea
        className="min-h-[120px] w-full resize-none border-none bg-transparent px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none"
        placeholder={isAnonymous ? 'Share anonymously...' : 'What is on your mind?'}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        maxLength={maxChars}
        aria-label="Post content"
      />

      {/* Poll editor */}
      {poll && (
        <div
          className="mx-4 mb-3 flex flex-col gap-2 rounded-lg border border-gray-200 p-3"
          aria-label="Poll editor"
        >
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Ask a question..."
            value={poll.question}
            readOnly
            aria-label="Poll question"
          />
          {poll.options.map((opt, i) => (
            <input
              key={i}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder={`Option ${i + 1}`}
              value={opt}
              readOnly
              aria-label={`Poll option ${i + 1}`}
            />
          ))}
          <button
            className="self-start rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            type="button"
            aria-label="Add poll option"
          >
            + Add option
          </button>
        </div>
      )}

      {/* Thread posts */}
      {threadPosts && threadPosts.length > 0 && (
        <div className="mx-4 mb-3 flex flex-col gap-3" aria-label="Thread editor">
          {threadPosts.map((tp, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-gray-200 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                {i + 2}
              </span>
              <textarea
                className="min-h-[60px] w-full resize-none border-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                placeholder="Continue thread..."
                value={tp.content}
                readOnly
                aria-label={`Thread post ${i + 2}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div
        className="flex items-center gap-1 border-t border-gray-100 px-3 py-2"
        role="toolbar"
        aria-label="Post tools"
      >
        <button
          className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          type="button"
          title="Add media"
          aria-label="Add media"
        >
          Media
        </button>
        <button
          className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          type="button"
          title="Add poll"
          onClick={onAddPoll}
          aria-label="Add poll"
        >
          Poll
        </button>
        <button
          className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          type="button"
          title="Add to thread"
          onClick={onAddThread}
          aria-label="Add to thread"
        >
          Thread
        </button>
        <button
          className="min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          type="button"
          title="Add GIF"
          aria-label="Add GIF"
        >
          GIF
        </button>
        <button
          className={`min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isAnonymous ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          type="button"
          onClick={onToggleAnonymous}
          aria-label="Toggle anonymous posting"
          aria-pressed={isAnonymous}
        >
          Anonymous
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
        <span
          className={`text-sm font-medium ${charWarning ? 'text-red-500' : 'text-gray-400'}`}
          aria-label={`${charRemaining} characters remaining`}
        >
          {charRemaining}
        </span>
        <button
          className="min-h-[44px] rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          disabled={!canSubmit || isSubmitting}
          onClick={onSubmit}
          aria-label={isSubmitting ? 'Posting' : 'Submit post'}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
}

export default PostComposer;
