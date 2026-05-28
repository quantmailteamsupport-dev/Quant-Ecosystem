'use client';

import type { FileItem } from '../hooks/useFiles';

interface FileCardProps {
  file: FileItem;
  onClick: () => void;
  viewMode: 'grid' | 'list';
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '\u{1F5BC}';
  if (mimeType.startsWith('video/')) return '\u{1F3AC}';
  if (mimeType.startsWith('audio/')) return '\u{1F3B5}';
  if (mimeType.includes('pdf')) return '\u{1F4C4}';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '\u{1F4CA}';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '\u{1F4CA}';
  if (mimeType.includes('document') || mimeType.includes('word')) return '\u{1F4DD}';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '\u{1F4E6}';
  if (mimeType.includes('text')) return '\u{1F4C3}';
  return '\u{1F4C1}';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FileCard({ file, onClick, viewMode }: FileCardProps) {
  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[var(--quant-muted)] rounded-lg transition-colors text-left"
        aria-label={`File: ${file.name}`}
      >
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          {getFileIcon(file.mimeType)}
        </span>
        <span className="flex-1 min-w-0 truncate font-medium text-sm">{file.name}</span>
        <span className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0">
          {formatFileSize(file.size)}
        </span>
        <span className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0 hidden sm:inline">
          {formatDate(file.updatedAt)}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 rounded-lg border border-[var(--quant-border)] hover:border-[var(--quant-primary)] hover:shadow-md transition-all text-center group"
      aria-label={`File: ${file.name}`}
    >
      <span className="text-4xl mb-3" aria-hidden="true">
        {getFileIcon(file.mimeType)}
      </span>
      <span className="text-sm font-medium truncate w-full">{file.name}</span>
      <span className="text-xs text-[var(--quant-muted-foreground)] mt-1">
        {formatFileSize(file.size)}
      </span>
      <span className="text-xs text-[var(--quant-muted-foreground)]">
        {formatDate(file.updatedAt)}
      </span>
    </button>
  );
}
