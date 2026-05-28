'use client';

import { useState } from 'react';
import { Button } from '@quant/shared-ui';

interface AIAction {
  id: string;
  label: string;
  icon: string;
}

const AI_ACTIONS: AIAction[] = [
  { id: 'rewrite', label: 'Rewrite', icon: '\u270E' },
  { id: 'summarize', label: 'Summarize', icon: '\u2211' },
  { id: 'translate', label: 'Translate', icon: '\u{1F310}' },
  { id: 'fix-grammar', label: 'Fix Grammar', icon: '\u2713' },
  { id: 'generate-diagram', label: 'Generate Diagram', icon: '\u25A6' },
];

interface AISidebarProps {
  onAction?: (actionId: string) => void;
}

export function AISidebar({ onAction }: AISidebarProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleAction = (actionId: string) => {
    setActiveAction(actionId);
    setResult(null);
    onAction?.(actionId);
  };

  return (
    <aside
      className="w-72 lg:w-80 border-l border-[var(--quant-border)] flex flex-col h-full bg-[var(--quant-background)]"
      aria-label="AI assistant panel"
    >
      <div className="p-3 border-b border-[var(--quant-border)]">
        <h2 className="text-sm font-semibold">AI Assistant</h2>
      </div>

      <div className="p-3 space-y-2">
        <p className="text-xs text-[var(--quant-muted-foreground)] mb-3">
          Select an action to apply to the current document or selection.
        </p>
        {AI_ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant={activeAction === action.id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handleAction(action.id)}
            aria-label={action.label}
          >
            <span className="mr-2" aria-hidden="true">
              {action.icon}
            </span>
            {action.label}
          </Button>
        ))}
      </div>

      {result && (
        <div className="flex-1 overflow-y-auto p-3 border-t border-[var(--quant-border)]">
          <h3 className="text-xs font-medium text-[var(--quant-muted-foreground)] mb-2">Result</h3>
          <div className="text-sm bg-[var(--quant-muted)] rounded-md p-3">{result}</div>
        </div>
      )}

      {!result && activeAction && (
        <div className="flex-1 flex items-center justify-center p-3">
          <p className="text-sm text-[var(--quant-muted-foreground)]">Processing...</p>
        </div>
      )}
    </aside>
  );
}
