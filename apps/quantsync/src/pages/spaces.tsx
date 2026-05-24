// ============================================================================
// QuantSync - Live Audio Spaces Page
// Browse and join live audio rooms
// ============================================================================

import type { Space } from '../types';

interface SpacesPageState {
  liveSpaces: Space[];
  scheduledSpaces: Space[];
  activeTab: 'live' | 'scheduled';
  isLoading: boolean;
}

export function SpacesPage() {
  const state: SpacesPageState = {
    liveSpaces: [],
    scheduledSpaces: [],
    activeTab: 'live',
    isLoading: true,
  };

  async function loadSpaces(): Promise<void> {
    state.isLoading = true;
    // API calls: quantSyncAPI.listLiveSpaces(), quantSyncAPI.listScheduledSpaces()
    state.isLoading = false;
  }

  async function createSpace(): Promise<void> {
    // Navigate to space creation modal/page
  }

  return {
    type: 'SpacesPage',
    layout: 'full-width',
    components: {
      header: { type: 'PageHeader', props: { title: 'Spaces', action: { label: 'Start a Space', onClick: createSpace } } },
      tabs: { type: 'TabBar', props: { tabs: ['live', 'scheduled'], active: state.activeTab } },
      liveGrid: { type: 'SpaceGrid', props: { spaces: state.liveSpaces, isLoading: state.isLoading } },
      scheduledList: { type: 'ScheduledSpaceList', props: { spaces: state.scheduledSpaces } },
    },
  };
}

export default SpacesPage;
