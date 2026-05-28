// ============================================================================
// QuantSync - TrendingSidebar Component
// Trending topics sidebar widget
// ============================================================================

import type { TrendingTopic } from '../types';

interface TrendingSidebarProps {
  topics?: TrendingTopic[];
  maxItems?: number;
}

export function TrendingSidebar({ topics = [], maxItems = 10 }: TrendingSidebarProps) {
  const displayTopics = topics.slice(0, maxItems);

  return (
    <aside
      className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm"
      aria-label="Trending topics"
    >
      <h3 className="border-b border-gray-100 px-4 py-3 text-lg font-bold text-gray-900">
        Trending
      </h3>
      <ul className="flex flex-col divide-y divide-gray-100">
        {displayTopics.map((topic, index) => (
          <li
            key={topic.id}
            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500">{topic.category}</span>
              <a
                className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
                href={`/hashtag/${topic.name}`}
                aria-label={`Trending: ${topic.hashtag}`}
              >
                {topic.hashtag}
              </a>
              <span className="text-xs text-gray-400">{formatCount(topic.postCount)} posts</span>
            </div>
            {topic.velocity > 2 && (
              <span className="ml-auto inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Hot
              </span>
            )}
          </li>
        ))}
      </ul>
      <a
        className="block border-t border-gray-100 px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-gray-50 transition-colors"
        href="/trending"
        aria-label="Show more trending topics"
      >
        Show more
      </a>
    </aside>
  );
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export default TrendingSidebar;
