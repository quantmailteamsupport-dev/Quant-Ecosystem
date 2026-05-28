'use client';

import { useState, use } from 'react';
import { Button, LoadingState, ErrorState } from '@quant/shared-ui';
import { useDocument } from '../../../hooks/useDocument';
import { DocToolbar } from '../../../components/DocToolbar';
import { DocEditor } from '../../../components/DocEditor';
import { PresenceBar } from '../../../components/PresenceBar';
import { CommentsPanel } from '../../../components/CommentsPanel';
import { VersionHistory } from '../../../components/VersionHistory';
import { AISidebar } from '../../../components/AISidebar';
import { ShareDialog } from '../../../components/ShareDialog';

type PanelType = 'comments' | 'history' | 'ai' | null;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DocEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: document, isLoading, error, refetch } = useDocument(id);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const togglePanel = (panel: PanelType) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  if (isLoading) {
    return <LoadingState text="Loading document..." />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex flex-col h-screen">
      <PresenceBar />
      <DocToolbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--quant-border)]">
            <h1 className="text-lg font-semibold truncate">
              {document?.title || 'Untitled Document'}
            </h1>
            <nav className="flex items-center gap-1" aria-label="Panel toggles">
              <Button
                variant={activePanel === 'comments' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => togglePanel('comments')}
                aria-pressed={activePanel === 'comments'}
                aria-label="Toggle comments panel"
              >
                Comments
              </Button>
              <Button
                variant={activePanel === 'history' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => togglePanel('history')}
                aria-pressed={activePanel === 'history'}
                aria-label="Toggle version history panel"
              >
                History
              </Button>
              <Button
                variant={activePanel === 'ai' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => togglePanel('ai')}
                aria-pressed={activePanel === 'ai'}
                aria-label="Toggle AI assistant panel"
              >
                AI
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShareOpen(true)}
                aria-label="Share document"
              >
                Share
              </Button>
            </nav>
          </div>

          <DocEditor initialContent={document?.content} />
        </div>

        {activePanel === 'comments' && <CommentsPanel />}
        {activePanel === 'history' && <VersionHistory />}
        {activePanel === 'ai' && <AISidebar />}
      </div>

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
