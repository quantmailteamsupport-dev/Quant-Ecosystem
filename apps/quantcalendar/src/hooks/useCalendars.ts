import { useQuery } from '@tanstack/react-query';

export interface Calendar {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
}

export function useCalendars() {
  return useQuery<Calendar[]>({
    queryKey: ['calendars'],
    queryFn: async () => {
      const response = await fetch('/api/calendars');
      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }
      const data = await response.json();
      return data;
    },
  });
}
