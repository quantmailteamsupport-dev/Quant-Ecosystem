'use client';

import { Skeleton } from '@quant/shared-ui';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-6">
      <div className="w-full max-w-4xl space-y-6">
        <Skeleton variant="rect" width="100%" height="400px" />
        <div className="flex justify-center gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="circle" width="48px" height="48px" />
          ))}
        </div>
        <div className="flex gap-3 justify-center">
          <Skeleton variant="rect" width="120px" height="36px" />
          <Skeleton variant="rect" width="120px" height="36px" />
        </div>
      </div>
    </div>
  );
}
