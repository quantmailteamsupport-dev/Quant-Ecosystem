// ============================================================================
// QuantAds - CampaignCard Component
// Campaign overview card
// ============================================================================

import type { Campaign } from '../types';

interface CampaignCardProps {
  campaign: Campaign;
  onClick?: (id: string) => void;
}

export function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    draft: 'bg-gray-100 text-gray-700',
    completed: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    pending_review: 'bg-orange-100 text-orange-700',
  };

  const budgetPercent =
    campaign.budget.amount > 0 ? (campaign.budget.spent / campaign.budget.amount) * 100 : 0;

  return (
    <article
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onClick?.(campaign.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(campaign.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Campaign: ${campaign.name}, status: ${campaign.status.replace('_', ' ')}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{campaign.name}</h4>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            statusColors[campaign.status] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {campaign.status.replace('_', ' ')}
        </span>
      </div>

      {/* Metrics */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Impressions</span>
          <span className="text-sm font-bold text-gray-900">
            {formatNum(campaign.metrics.impressions)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Clicks</span>
          <span className="text-sm font-bold text-gray-900">
            {formatNum(campaign.metrics.clicks)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">CTR</span>
          <span className="text-sm font-bold text-gray-900">
            {campaign.metrics.ctr.toFixed(2)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Spend</span>
          <span className="text-sm font-bold text-gray-900">
            ${campaign.metrics.spend.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Budget Bar */}
      <div className="mb-3">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label="Budget spent"
          aria-valuenow={budgetPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>
        <span className="mt-1 block text-xs text-gray-500">
          ${campaign.budget.spent.toFixed(0)} / ${campaign.budget.amount.toFixed(0)}
        </span>
      </div>

      {/* Objective */}
      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-600">
        {campaign.objective}
      </span>
    </article>
  );
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default CampaignCard;
