import { useQuery } from '@tanstack/react-query';

export interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
  owner: string;
  collaborators: string[];
  version: number;
}

export function useDocument(id: string) {
  return useQuery<Document>({
    queryKey: ['document', id],
    queryFn: async () => {
      const response = await fetch(`/api/docs/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      return response.json();
    },
    enabled: !!id,
  });
}
