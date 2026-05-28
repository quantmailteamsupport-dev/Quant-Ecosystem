'use client';

import { useState } from 'react';
import { Dialog, Input, Button, Select, Avatar } from '@quant/shared-ui';

interface SharedUser {
  id: string;
  email: string;
  name: string;
  permission: 'viewer' | 'editor' | 'owner';
}

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  sharedWith?: SharedUser[];
  onShare?: (email: string, permission: string) => void;
  onRemove?: (userId: string) => void;
}

const PERMISSION_OPTIONS = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'owner', label: 'Owner' },
];

export function ShareDialog({
  open,
  onClose,
  sharedWith = [],
  onShare,
  onRemove,
}: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('editor');

  const handleShare = () => {
    if (email.trim() && onShare) {
      onShare(email.trim(), permission);
      setEmail('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Share Document" size="md">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address..."
              aria-label="Email address to share with"
              type="email"
            />
          </div>
          <Select
            options={PERMISSION_OPTIONS}
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            aria-label="Permission level"
          />
          <Button variant="primary" onClick={handleShare} disabled={!email.trim()}>
            Share
          </Button>
        </div>

        {sharedWith.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[var(--quant-muted-foreground)]">
              People with access
            </h3>
            <ul className="space-y-2" aria-label="Shared users">
              {sharedWith.map((user) => (
                <li key={user.id} className="flex items-center gap-3 p-2 rounded-md">
                  <Avatar name={user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-[var(--quant-muted-foreground)] truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--quant-muted-foreground)] capitalize">
                    {user.permission}
                  </span>
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(user.id)}
                      aria-label={`Remove ${user.name}`}
                    >
                      &#10005;
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
