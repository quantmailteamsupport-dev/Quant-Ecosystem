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
    active: 'green', paused: 'yellow', draft: 'gray', completed: 'blue', rejected: 'red', pending_review: 'orange',
  };

  return {
    type: 'div',
    className: 'campaign-card',
    onClick: () => onClick?.(campaign.id),
    children: [
      { type: 'div', className: 'campaign-header', children: [
        { type: 'h4', text: campaign.name },
        { type: 'span', className: `status-badge ${statusColors[campaign.status]}`, text: campaign.status.replace('_', ' ') },
      ]},
      { type: 'div', className: 'campaign-metrics', children: [
        { type: 'div', className: 'metric', children: [{ type: 'span', className: 'label', text: 'Impressions' }, { type: 'span', className: 'value', text: formatNum(campaign.metrics.impressions) }] },
        { type: 'div', className: 'metric', children: [{ type: 'span', className: 'label', text: 'Clicks' }, { type: 'span', className: 'value', text: formatNum(campaign.metrics.clicks) }] },
        { type: 'div', className: 'metric', children: [{ type: 'span', className: 'label', text: 'CTR' }, { type: 'span', className: 'value', text: `${campaign.metrics.ctr.toFixed(2)}%` }] },
        { type: 'div', className: 'metric', children: [{ type: 'span', className: 'label', text: 'Spend' }, { type: 'span', className: 'value', text: `$${campaign.metrics.spend.toFixed(2)}` }] },
      ]},
      { type: 'div', className: 'campaign-budget', children: [
        { type: 'div', className: 'budget-bar', style: { width: `${(campaign.budget.spent / campaign.budget.amount) * 100}%` } },
        { type: 'span', text: `$${campaign.budget.spent.toFixed(0)} / $${campaign.budget.amount.toFixed(0)}` },
      ]},
      { type: 'span', className: 'campaign-objective', text: campaign.objective },
    ],
  };
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default CampaignCard;
