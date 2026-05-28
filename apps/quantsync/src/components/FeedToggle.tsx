// ============================================================================
// QuantSync - FeedToggle Component
// Feed mode switcher (For You / Following / Anonymous / Trending)
// ============================================================================

import type { FeedMode } from '../types';

interface FeedToggleProps {
  activeMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

const FEED_MODES: { mode: FeedMode; label: string; icon: string }[] = [
  { mode: 'for-you', label: 'For You', icon: 'sparkles' },
  { mode: 'following', label: 'Following', icon: 'users' },
  { mode: 'chronological', label: 'Latest', icon: 'clock' },
  { mode: 'anonymous', label: 'Anonymous', icon: 'mask' },
  { mode: 'trending', label: 'Trending', icon: 'fire' },
];

export function FeedToggle({ activeMode, onModeChange }: FeedToggleProps) {
  return (
    <nav
      className="flex items-center gap-1 border-b border-gray-200 px-2"
      role="tablist"
      aria-label="Feed mode"
    >
      {FEED_MODES.map(({ mode, label, icon }) => (
        <button
          key={mode}
          className={`relative flex min-h-[44px] items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeMode === mode ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
          role="tab"
          aria-selected={activeMode === mode}
          onClick={() => onModeChange(mode)}
        >
          <span className={`icon icon-${icon}`} aria-hidden="true" />
          <span>{label}</span>
          {activeMode === mode && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />
          )}
        </button>
      ))}
    </nav>
  );
}

export default FeedToggle;
