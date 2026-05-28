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

export function BudgetOptimizer({
  currentBudget,
  recommendedBudget,
  expectedResults,
  reasoning,
  onApply,
}: BudgetOptimizerProps) {
  const change = recommendedBudget
    ? ((recommendedBudget - currentBudget) / currentBudget) * 100
    : 0;
  const direction = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'maintain';

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      role="region"
      aria-label="AI budget recommendation"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">AI Budget Recommendation</h4>
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
          AI
        </span>
      </div>

      {/* Budget Comparison */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex flex-col items-center rounded-lg bg-gray-50 px-4 py-3">
          <span className="text-xs text-gray-500">Current</span>
          <span className="text-lg font-bold text-gray-900">${currentBudget.toFixed(2)}/day</span>
        </div>

        <span className="text-lg text-gray-400" aria-hidden="true">
          {direction === 'increase' ? '\u2192' : direction === 'decrease' ? '\u2190' : '='}
        </span>

        {recommendedBudget != null && (
          <div
            className={`flex flex-col items-center rounded-lg px-4 py-3 ${
              direction === 'increase'
                ? 'bg-green-50'
                : direction === 'decrease'
                  ? 'bg-red-50'
                  : 'bg-gray-50'
            }`}
          >
            <span className="text-xs text-gray-500">Recommended</span>
            <span className="text-lg font-bold text-gray-900">
              ${recommendedBudget.toFixed(2)}/day
            </span>
            <span
              className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {change >= 0 ? '+' : ''}
              {change.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Expected Results */}
      {expectedResults && (
        <div className="mb-4 rounded-lg bg-indigo-50 p-3">
          <h5 className="mb-2 text-xs font-semibold text-gray-700">Expected Daily Results</h5>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-indigo-700">
                {expectedResults.impressions.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">impressions</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-indigo-700">
                {expectedResults.clicks.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">clicks</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-indigo-700">
                {expectedResults.conversions.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">conversions</span>
            </div>
          </div>
        </div>
      )}

      {/* Reasoning */}
      {reasoning && <p className="mb-4 text-xs leading-relaxed text-gray-600">{reasoning}</p>}

      {/* Apply Button */}
      {recommendedBudget != null && onApply && (
        <button
          type="button"
          onClick={() => onApply(recommendedBudget)}
          className="min-h-[44px] w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label="Apply AI budget recommendation"
        >
          Apply Recommendation
        </button>
      )}
    </div>
  );
}

export default BudgetOptimizer;
