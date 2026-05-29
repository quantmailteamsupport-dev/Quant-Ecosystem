'use client';

import { AppShell, LoadingState } from '@quant/shared-ui';
import { AppSidebar } from '../../../components/AppSidebar';

export default function ThreadPage() {
  return (
    <AppShell sidebar={<AppSidebar />}>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Thread</h1>
        <p className="text-[var(--quant-muted-foreground)] mt-2">Loading thread...</p>
        <div className="mt-4">
          <LoadingState text="Loading thread details" />
        </div>
      </div>
    </AppShell>
  );
}
