'use client';

import { Select, EmptyState, LoadingState, ErrorState } from '@quant/shared-ui';
import type { SelectOption } from '@quant/shared-ui';
import { useState } from 'react';
import { useFiles } from '../hooks/useFiles';
import type { FileItem } from '../hooks/useFiles';
import { FileCard } from './FileCard';
import { FolderCard } from './FolderCard';

interface FileBrowserProps {
  currentPath: string;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onFileSelect: (file: FileItem) => void;
  onFolderOpen: (path: string) => void;
}

const SORT_OPTIONS: SelectOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'modified', label: 'Modified' },
  { value: 'size', label: 'Size' },
];

export function FileBrowser({
  currentPath,
  viewMode,
  onViewModeChange,
  onFileSelect,
  onFolderOpen,
}: FileBrowserProps) {
  const { data: files, isLoading, error } = useFiles(currentPath);
  const [sortBy, setSortBy] = useState('name');

  if (isLoading) {
    return <LoadingState text="Loading files..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load files" message={error.message} />;
  }

  if (!files || files.length === 0) {
    return (
      <EmptyState
        title="No files"
        description="This folder is empty. Upload files to get started."
      />
    );
  }

  const sortedFiles = [...files].sort((a, b) => {
    switch (sortBy) {
      case 'modified':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'size':
        return b.size - a.size;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const folders = sortedFiles.filter((f) => f.type === 'folder');
  const fileItems = sortedFiles.filter((f) => f.type === 'file');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-[var(--quant-primary)] text-white'
                : 'text-[var(--quant-muted-foreground)] hover:bg-[var(--quant-muted)]'
            }`}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--quant-primary)] text-white'
                : 'text-[var(--quant-muted-foreground)] hover:bg-[var(--quant-muted)]'
            }`}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="1" y="2" width="14" height="2" rx="1" />
              <rect x="1" y="7" width="14" height="2" rx="1" />
              <rect x="1" y="12" width="14" height="2" rx="1" />
            </svg>
          </button>
        </div>

        <div className="w-40">
          <Select
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort files by"
          />
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={() => onFolderOpen(folder.path)}
              viewMode="grid"
            />
          ))}
          {fileItems.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onClick={() => onFileSelect(file)}
              viewMode="grid"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={() => onFolderOpen(folder.path)}
              viewMode="list"
            />
          ))}
          {fileItems.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onClick={() => onFileSelect(file)}
              viewMode="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}
