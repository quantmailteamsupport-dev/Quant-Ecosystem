// ============================================================================
// QuantAds - Campaigns Page
// Campaign listing and management
// ============================================================================

import type { Campaign, CampaignStatus } from '../types';

interface CampaignsPageState {
  campaigns: Campaign[];
  statusFilter: CampaignStatus | 'all';
  isLoading: boolean;
}

export function CampaignsPage() {
  const state: CampaignsPageState = {
    campaigns: [],
    statusFilter: 'all',
    isLoading: true,
  };

  async function loadCampaigns(status?: CampaignStatus): Promise<void> {
    state.isLoading = true;
    state.statusFilter = status || 'all';
    // API call: quantAdsAPI.listCampaigns(status)
    state.isLoading = false;
  }

  return {
    type: 'CampaignsPage',
    layout: 'full-width',
    components: {
      header: { type: 'PageHeader', props: { title: 'Campaigns', action: { label: 'New Campaign', href: '/create-campaign' } } },
      filters: { type: 'StatusFilter', props: { statuses: ['all', 'active', 'paused', 'draft', 'completed'], active: state.statusFilter, onChange: loadCampaigns } },
      list: { type: 'CampaignTable', props: { campaigns: state.campaigns, isLoading: state.isLoading } },
    },
  };
}

export default CampaignsPage;
