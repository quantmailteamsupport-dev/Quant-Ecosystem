'use client';

import { FileUpload, Button } from '@quant/shared-ui';
import { useCallback } from 'react';

export function UploadArea() {
  const handleUpload = useCallback((files: File[]) => {
    // Upload logic handled via API
    void files;
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('#drive-upload-input');
            input?.click();
          }}
        >
          Upload
        </Button>
        <input id="drive-upload-input" type="file" multiple className="hidden" aria-hidden="true" />
      </div>
      <FileUpload
        multiple
        onUpload={handleUpload}
        aria-label="Drop files to upload"
        className="min-h-[80px]"
      />
    </div>
  );
}
