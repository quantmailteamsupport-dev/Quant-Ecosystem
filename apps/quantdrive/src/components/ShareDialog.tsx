'use client';

import { Dialog, Input, Select, Button } from '@quant/shared-ui';
import type { SelectOption } from '@quant/shared-ui';
import { useState } from 'react';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
}

const PERMISSION_OPTIONS: SelectOption[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
];

export function ShareDialog({ open, onClose, fileName }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('viewer');

  const handleShare = () => {
    if (email.trim()) {
      // Sharing logic handled via API
      setEmail('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Share "${fileName}"`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-[var(--quant-muted-foreground)]">
          Add people to share this file with.
        </p>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="share-email" className="block text-sm font-medium mb-1">
              Email address
            </label>
            <Input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              aria-label="Email address to share with"
            />
          </div>
          <div className="w-28">
            <Select
              options={PERMISSION_OPTIONS}
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              aria-label="Permission level"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleShare} disabled={!email.trim()}>
            Share
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
