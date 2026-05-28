'use client';

import { useStorageQuota } from '../hooks/useStorageQuota';

export function StorageBar() {
  const { data: quota, isLoading } = useStorageQuota();

  if (isLoading || !quota) {
    return (
      <div className="space-y-2" aria-label="Storage usage loading">
        <div className="h-2 rounded-full bg-[var(--quant-muted)] animate-pulse" />
        <p className="text-xs text-[var(--quant-muted-foreground)]">Loading storage...</p>
      </div>
    );
  }

  const percentage = quota.total > 0 ? (quota.used / quota.total) * 100 : 0;

  const getBarColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div
      className="space-y-2"
      role="progressbar"
      aria-valuenow={quota.used}
      aria-valuemin={0}
      aria-valuemax={quota.total}
      aria-label="Storage usage"
    >
      <div className="h-2 rounded-full bg-[var(--quant-muted)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-[var(--quant-muted-foreground)]">
        {quota.used} {quota.unit} of {quota.total} {quota.unit} used
      </p>
    </div>
  );
}
