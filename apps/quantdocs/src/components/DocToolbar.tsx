'use client';

import { Button } from '@quant/shared-ui';

interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
}

const FORMATTING_ACTIONS: ToolbarAction[] = [
  { id: 'bold', label: 'Bold', icon: 'B' },
  { id: 'italic', label: 'Italic', icon: 'I' },
  { id: 'underline', label: 'Underline', icon: 'U' },
  { id: 'strikethrough', label: 'Strikethrough', icon: 'S' },
];

const HEADING_ACTIONS: ToolbarAction[] = [
  { id: 'h1', label: 'Heading 1', icon: 'H1' },
  { id: 'h2', label: 'Heading 2', icon: 'H2' },
  { id: 'h3', label: 'Heading 3', icon: 'H3' },
];

const BLOCK_ACTIONS: ToolbarAction[] = [
  { id: 'bullet-list', label: 'Bullet List', icon: '\u2022' },
  { id: 'numbered-list', label: 'Numbered List', icon: '1.' },
  { id: 'quote', label: 'Quote', icon: '\u201C' },
  { id: 'code', label: 'Code', icon: '</>' },
  { id: 'link', label: 'Link', icon: '\u{1F517}' },
];

interface DocToolbarProps {
  onAction?: (actionId: string) => void;
}

export function DocToolbar({ onAction }: DocToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--quant-border)] bg-[var(--quant-muted)]"
      role="toolbar"
      aria-label="Document formatting toolbar"
    >
      <ToolbarGroup actions={FORMATTING_ACTIONS} onAction={onAction} />
      <div className="w-px h-6 bg-[var(--quant-border)] mx-1" aria-hidden="true" />
      <ToolbarGroup actions={HEADING_ACTIONS} onAction={onAction} />
      <div className="w-px h-6 bg-[var(--quant-border)] mx-1" aria-hidden="true" />
      <ToolbarGroup actions={BLOCK_ACTIONS} onAction={onAction} />
    </div>
  );
}

function ToolbarGroup({
  actions,
  onAction,
}: {
  actions: ToolbarAction[];
  onAction?: (actionId: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="ghost"
          size="sm"
          onClick={() => onAction?.(action.id)}
          aria-label={action.label}
        >
          <span className="text-xs font-mono">{action.icon}</span>
        </Button>
      ))}
    </div>
  );
}
