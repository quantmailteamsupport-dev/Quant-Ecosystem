'use client';

import type { FileItem } from '../hooks/useFiles';

interface FolderCardProps {
  folder: FileItem;
  onClick: () => void;
  viewMode: 'grid' | 'list';
}

export function FolderCard({ folder, onClick, viewMode }: FolderCardProps) {
  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[var(--quant-muted)] rounded-lg transition-colors text-left"
        aria-label={`Folder: ${folder.name}`}
      >
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          {'\u{1F4C1}'}
        </span>
        <span className="flex-1 min-w-0 truncate font-medium text-sm">{folder.name}</span>
        <span className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0">Folder</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 rounded-lg border border-[var(--quant-border)] hover:border-[var(--quant-primary)] hover:shadow-md transition-all text-center group"
      aria-label={`Folder: ${folder.name}`}
    >
      <span className="text-4xl mb-3" aria-hidden="true">
        {'\u{1F4C1}'}
      </span>
      <span className="text-sm font-medium truncate w-full">{folder.name}</span>
    </button>
  );
}
