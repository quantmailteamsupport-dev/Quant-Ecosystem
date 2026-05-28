'use client';

import { EmptyState, LoadingState } from '@quant/shared-ui';
import { useFiles } from '../hooks/useFiles';
import type { FileItem } from '../hooks/useFiles';

interface SearchResultsProps {
  query: string;
  onFileSelect: (file: FileItem) => void;
}

export function SearchResults({ query, onFileSelect }: SearchResultsProps) {
  const { data: files, isLoading } = useFiles(`search:${query}`);

  if (isLoading) {
    return <LoadingState text="Searching files..." />;
  }

  if (!files || files.length === 0) {
    return (
      <EmptyState
        title="No results found"
        description={`No files matching "${query}" were found.`}
      />
    );
  }

  return (
    <div className="space-y-1" role="list" aria-label="Search results">
      {files.map((file) => (
        <button
          key={file.id}
          onClick={() => onFileSelect(file)}
          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[var(--quant-muted)] rounded-lg transition-colors text-left"
          role="listitem"
          aria-label={`${file.type === 'folder' ? 'Folder' : 'File'}: ${file.name}`}
        >
          <span className="text-2xl flex-shrink-0" aria-hidden="true">
            {file.type === 'folder' ? '\u{1F4C1}' : '\u{1F4C4}'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-[var(--quant-muted-foreground)] truncate">{file.path}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
