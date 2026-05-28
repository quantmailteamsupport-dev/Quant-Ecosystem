'use client';

import { Skeleton } from '@quant/shared-ui';

export default function Loading() {
  return (
    <div className="flex h-screen">
      <div className="w-64 border-r border-[var(--quant-border)] p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="text" width="100%" height="32px" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton variant="rect" width="200px" height="36px" />
          <Skeleton variant="rect" width="120px" height="36px" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height="140px" />
          ))}
        </div>
      </div>
    </div>
  );
}
