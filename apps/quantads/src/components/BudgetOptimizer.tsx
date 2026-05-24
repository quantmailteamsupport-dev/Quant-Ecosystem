// ============================================================================
// QuantAds - BudgetOptimizer Component
// AI budget optimization widget
// ============================================================================

interface BudgetOptimizerProps {
  currentBudget: number;
  recommendedBudget?: number;
  expectedResults?: { impressions: number; clicks: number; conversions: number };
  reasoning?: string;
  onApply?: (amount: number) => void;
}

export function BudgetOptimizer({ currentBudget, recommendedBudget, expectedResults, reasoning, onApply }: BudgetOptimizerProps) {
  const change = recommendedBudget ? ((recommendedBudget - currentBudget) / currentBudget) * 100 : 0;
  const direction = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'maintain';

  return {
    type: 'div',
    className: 'budget-optimizer',
    children: [
      { type: 'div', className: 'optimizer-header', children: [
        { type: 'h4', text: 'AI Budget Recommendation' },
        { type: 'span', className: 'ai-badge', text: 'AI' },
      ] },
      { type: 'div', className: 'budget-comparison', children: [
        { type: 'div', className: 'current', children: [
          { type: 'span', className: 'label', text: 'Current' },
          { type: 'span', className: 'amount', text: `$${currentBudget.toFixed(2)}/day` },
        ] },
        { type: 'div', className: 'arrow', text: direction === 'increase' ? '>' : direction === 'decrease' ? '<' : '=' },
        recommendedBudget && { type: 'div', className: `recommended ${direction}`, children: [
          { type: 'span', className: 'label', text: 'Recommended' },
          { type: 'span', className: 'amount', text: `$${recommendedBudget.toFixed(2)}/day` },
          { type: 'span', className: 'change', text: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%` },
        ] },
      ].filter(Boolean) },
      expectedResults && { type: 'div', className: 'expected-results', children: [
        { type: 'h5', text: 'Expected Daily Results' },
        { type: 'div', className: 'results-grid', children: [
          { type: 'span', text: `${expectedResults.impressions.toLocaleString()} impressions` },
          { type: 'span', text: `${expectedResults.clicks.toLocaleString()} clicks` },
          { type: 'span', text: `${expectedResults.conversions.toLocaleString()} conversions` },
        ] },
      ] },
      reasoning && { type: 'p', className: 'reasoning', text: reasoning },
      recommendedBudget && onApply && {
        type: 'button',
        className: 'apply-btn',
        onClick: () => onApply(recommendedBudget),
        text: 'Apply Recommendation',
      },
    ].filter(Boolean),
  };
}

export default BudgetOptimizer;
