'use client';

import { useState } from 'react';
import { AppShell, Sidebar, Button, PageTransition } from '@quant/shared-ui';
import type { SidebarItem } from '@quant/shared-ui';
import { DocList } from '../components/DocList';

const NAV_ITEMS: SidebarItem[] = [
  { id: 'all', label: 'All Docs' },
  { id: 'recent', label: 'Recent' },
  { id: 'shared', label: 'Shared with Me' },
  { id: 'templates', label: 'Templates' },
  { id: 'starred', label: 'Starred' },
  { id: 'trash', label: 'Trash' },
];

export default function DocsPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const sidebarItems = NAV_ITEMS.map((item) => ({
    ...item,
    active: item.id === activeFilter,
    onClick: () => setActiveFilter(item.id),
  }));

  return (
    <AppShell
      sidebar={
        <Sidebar
          items={sidebarItems}
          header={
            <div className="space-y-3">
              <h1 className="text-lg font-bold">QuantDocs</h1>
              <Button variant="primary" size="sm">
                New Document
              </Button>
            </div>
          }
          aria-label="Document navigation"
        />
      }
      aria-label="QuantDocs application"
    >
      <PageTransition>
        <DocList filter={activeFilter} />
      </PageTransition>
    </AppShell>
  );
}
