'use client';

import { Button } from '@quant/shared-ui';

interface VersionEntry {
  version: number;
  timestamp: string;
  author: string;
}

interface VersionHistoryProps {
  versions?: VersionEntry[];
  onRestore?: (version: number) => void;
}

export function VersionHistory({ versions = [], onRestore }: VersionHistoryProps) {
  return (
    <aside
      className="w-72 lg:w-80 border-l border-[var(--quant-border)] flex flex-col h-full bg-[var(--quant-background)]"
      aria-label="Version history panel"
    >
      <div className="p-3 border-b border-[var(--quant-border)]">
        <h2 className="text-sm font-semibold">Version History</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {versions.length === 0 ? (
          <p className="text-sm text-[var(--quant-muted-foreground)] text-center py-8">
            No version history available
          </p>
        ) : (
          <ol className="space-y-3" aria-label="Document versions">
            {versions.map((entry) => (
              <li
                key={entry.version}
                className="flex items-center justify-between p-2 rounded-md hover:bg-[var(--quant-muted)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Version {entry.version}</p>
                  <p className="text-xs text-[var(--quant-muted-foreground)]">
                    <time dateTime={entry.timestamp}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </time>
                    {' \u2022 '}
                    {entry.author}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRestore?.(entry.version)}
                  aria-label={`Restore version ${entry.version}`}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
