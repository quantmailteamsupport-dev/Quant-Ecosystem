import { useQuery } from '@tanstack/react-query';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  calendarId: string;
  color: string;
  isRecurring: boolean;
  location: string;
}

export function useEvents(options?: { calendarId?: string; start?: string; end?: string }) {
  return useQuery<CalendarEvent[]>({
    queryKey: ['events', options?.calendarId, options?.start, options?.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.calendarId) params.set('calendarId', options.calendarId);
      if (options?.start) params.set('start', options.start);
      if (options?.end) params.set('end', options.end);
      const query = params.toString();
      const url = `/api/events${query ? `?${query}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      return data;
    },
  });
}
