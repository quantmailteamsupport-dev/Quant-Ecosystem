// ============================================================================
// QuantAds - Create Campaign Page
// Campaign creation wizard
// ============================================================================

import type { CampaignObjective } from '../types';

interface CreateCampaignState {
  step: number;
  totalSteps: number;
  name: string;
  objective: CampaignObjective | null;
  budget: { type: 'daily' | 'lifetime'; amount: number; bidStrategy: string };
  schedule: { startDate: string; endDate: string; isEvergreen: boolean };
  targeting: any;
  placements: string[];
  isSubmitting: boolean;
}

export function CreateCampaignPage() {
  const state: CreateCampaignState = {
    step: 1,
    totalSteps: 5,
    name: '',
    objective: null,
    budget: { type: 'daily', amount: 50, bidStrategy: 'lowest_cost' },
    schedule: { startDate: '', endDate: '', isEvergreen: false },
    targeting: null,
    placements: [],
    isSubmitting: false,
  };

  function nextStep(): void { if (state.step < state.totalSteps) state.step++; }
  function prevStep(): void { if (state.step > 1) state.step--; }

  async function submit(): Promise<void> {
    state.isSubmitting = true;
    // quantAdsAPI.createCampaign(...)
    state.isSubmitting = false;
  }

  return {
    type: 'CreateCampaignPage',
    layout: 'centered',
    components: {
      progress: { type: 'WizardProgress', props: { current: state.step, total: state.totalSteps, steps: ['Objective', 'Budget', 'Targeting', 'Placements', 'Review'] } },
      content: {
        step1: { type: 'ObjectiveSelector', props: { selected: state.objective, objectives: ['awareness', 'reach', 'traffic', 'engagement', 'conversions', 'app_installs', 'video_views'] } },
        step2: { type: 'BudgetConfigurator', props: { budget: state.budget } },
        step3: { type: 'AudienceBuilder', props: { targeting: state.targeting } },
        step4: { type: 'PlacementSelector', props: { selected: state.placements } },
        step5: { type: 'CampaignReview', props: { name: state.name, objective: state.objective, budget: state.budget } },
      },
      navigation: { type: 'WizardNav', props: { step: state.step, total: state.totalSteps, onNext: nextStep, onPrev: prevStep, onSubmit: submit, isSubmitting: state.isSubmitting } },
    },
  };
}

export default CreateCampaignPage;
