// ============================================================================
// QuantAds - AnalyticsChart Component
// Charts for impressions, clicks, conversions
// ============================================================================

interface DataPoint {
  date: string;
  value: number;
}

interface AnalyticsChartProps {
  title: string;
  type: 'line' | 'bar' | 'area' | 'pie';
  data: DataPoint[];
  color?: string;
  showTrend?: boolean;
  height?: number;
}

export function AnalyticsChart({
  title,
  type,
  data,
  color = '#4F46E5',
  showTrend = true,
  height = 300,
}: AnalyticsChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const avg = data.length > 0 ? total / data.length : 0;

  // Calculate trend
  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint).reduce((s, d) => s + d.value, 0) / (midpoint || 1);
  const secondHalf =
    data.slice(midpoint).reduce((s, d) => s + d.value, 0) / (data.length - midpoint || 1);
  const trendPercent = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  const trendDirection = trendPercent >= 0 ? 'up' : 'down';

  return (
    <div
      className={`relative flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm chart-${type}`}
      style={{ height: `${height}px` }}
      role="figure"
      aria-label={`${title} analytics chart`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {showTrend && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              trendDirection === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
            aria-label={`Trend ${trendDirection} ${Math.abs(trendPercent).toFixed(1)} percent`}
          >
            {trendPercent >= 0 ? '+' : ''}
            {trendPercent.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="mb-3 flex gap-4">
        <span className="text-xs text-gray-500">
          Total: <span className="font-medium text-gray-900">{formatValue(total)}</span>
        </span>
        <span className="text-xs text-gray-500">
          Avg: <span className="font-medium text-gray-900">{formatValue(avg)}</span>
        </span>
      </div>

      {/* Chart Canvas */}
      <div
        className="relative flex flex-1 items-end gap-px overflow-hidden rounded-md"
        role="img"
        aria-label={`Bar chart showing ${data.length} data points`}
      >
        {data.map((point, i) => (
          <div
            key={`${point.date}-${i}`}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80"
            style={{
              height: `${(point.value / maxValue) * 100}%`,
              backgroundColor: color,
              minWidth: '2px',
            }}
            title={`${point.date}: ${formatValue(point.value)}`}
            aria-label={`${point.date}: ${formatValue(point.value)}`}
          />
        ))}
      </div>

      {/* X-Axis */}
      <div className="mt-2 flex justify-between">
        {data.length > 0 && <span className="text-xs text-gray-400">{data[0]?.date}</span>}
        {data.length > 1 && (
          <span className="text-xs text-gray-400">{data[data.length - 1]?.date}</span>
        )}
      </div>
    </div>
  );
}

function formatValue(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

export default AnalyticsChart;
