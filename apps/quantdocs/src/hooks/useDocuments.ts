import { useQuery } from '@tanstack/react-query';

export interface DocSummary {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  owner: string;
  sharedWith: string[];
  isStarred: boolean;
}

export function useDocuments(options?: { filter?: string; search?: string }) {
  return useQuery<DocSummary[]>({
    queryKey: ['documents', options?.filter, options?.search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.filter) params.set('filter', options.filter);
      if (options?.search) params.set('search', options.search);
      const query = params.toString();
      const url = `/api/docs${query ? `?${query}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    },
  });
}
