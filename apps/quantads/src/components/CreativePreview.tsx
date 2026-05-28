// ============================================================================
// QuantAds - CreativePreview Component
// Ad creative preview across formats
// ============================================================================

import type { Creative } from '../types';

interface CreativePreviewProps {
  creative: Creative;
  placement?: string;
  showMetrics?: boolean;
}

export function CreativePreview({
  creative,
  placement = 'feed',
  showMetrics = false,
}: CreativePreviewProps) {
  const dimensions = getDimensions(placement);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      style={{ maxWidth: `${dimensions.width}px` }}
      role="article"
      aria-label={`Creative preview: ${creative.name}`}
    >
      {/* Preview Label */}
      <div className="border-b border-gray-100 bg-gray-50 px-3 py-1.5">
        <span className="text-xs font-medium text-gray-500">
          {creative.format} - {placement}
        </span>
      </div>

      {/* Preview Frame */}
      <div
        className="relative overflow-hidden bg-gray-100"
        style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }}
      >
        {creative.assets.length > 0 && (
          <img
            src={creative.assets[0]?.url}
            alt={creative.headline}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-4">
          <span className="mb-1 inline-block w-fit rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
            Sponsored
          </span>
          <h3 className="mb-0.5 text-sm font-bold text-white line-clamp-2">{creative.headline}</h3>
          <p className="mb-2 text-xs text-white/80 line-clamp-2">{creative.description}</p>
          <button
            type="button"
            className="min-h-[44px] w-fit rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
            aria-label={creative.callToAction}
          >
            {creative.callToAction}
          </button>
        </div>
      </div>

      {/* Metrics */}
      {showMetrics && creative.performance && (
        <div className="flex gap-4 border-t border-gray-100 px-3 py-2">
          <span className="text-xs text-gray-500">
            {creative.performance.impressions.toLocaleString()} imp
          </span>
          <span className="text-xs text-gray-500">{creative.performance.ctr.toFixed(2)}% CTR</span>
          <span className="text-xs text-gray-500">
            Quality: {(creative.performance.qualityScore * 10).toFixed(1)}/10
          </span>
        </div>
      )}

      {/* Status Badge */}
      <div className="border-t border-gray-100 px-3 py-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            creative.status === 'approved'
              ? 'bg-green-100 text-green-700'
              : creative.status === 'rejected'
                ? 'bg-red-100 text-red-700'
                : creative.status === 'pending_review'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
          }`}
        >
          {creative.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}

function getDimensions(placement: string): { width: number; height: number } {
  const dims: Record<string, { width: number; height: number }> = {
    feed: { width: 600, height: 400 },
    sidebar: { width: 300, height: 250 },
    banner: { width: 728, height: 90 },
    stories: { width: 360, height: 640 },
    'pre-roll': { width: 640, height: 360 },
  };
  return dims[placement] || { width: 600, height: 400 };
}

export default CreativePreview;
