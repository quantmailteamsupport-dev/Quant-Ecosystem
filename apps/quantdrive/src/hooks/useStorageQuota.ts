import { useQuery } from '@tanstack/react-query';

export interface StorageQuota {
  used: number;
  total: number;
  unit: string;
}

export function useStorageQuota() {
  return useQuery<StorageQuota>({
    queryKey: ['storage-quota'],
    queryFn: async () => {
      const response = await fetch('/api/storage/quota');
      if (!response.ok) {
        throw new Error('Failed to fetch storage quota');
      }
      return response.json();
    },
  });
}
