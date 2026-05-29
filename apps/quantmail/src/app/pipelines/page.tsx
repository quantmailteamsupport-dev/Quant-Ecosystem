'use client';

import { AppShell } from '@quant/shared-ui';
import { AppSidebar } from '../../components/AppSidebar';

export default function PipelinesPage() {
  return (
    <AppShell sidebar={<AppSidebar />}>
      <div className="p-6">
        <h1 className="text-2xl font-bold">CI/CD Pipelines</h1>
        <p className="text-[var(--quant-muted-foreground)] mt-2">Coming soon...</p>
      </div>
    </AppShell>
  );
}
