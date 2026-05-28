import { useQuery } from '@tanstack/react-query';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mimeType: string;
  updatedAt: string;
  createdAt: string;
  isStarred: boolean;
  path: string;
  thumbnailUrl: string | null;
}

export function useFiles(path: string) {
  return useQuery<FileItem[]>({
    queryKey: ['files', path],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (path) params.set('path', path);
      const query = params.toString();
      const url = `/api/files${query ? `?${query}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      return response.json();
    },
  });
}
