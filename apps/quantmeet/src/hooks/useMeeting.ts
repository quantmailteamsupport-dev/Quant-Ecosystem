import { useQuery } from '@tanstack/react-query';

export interface MeetingInfo {
  id: string;
  title: string;
  hostId: string;
  status: 'waiting' | 'active' | 'ended';
  participantCount: number;
  isRecording: boolean;
  startedAt: string | null;
}

export function useMeeting(roomId: string) {
  return useQuery<MeetingInfo>({
    queryKey: ['meeting', roomId],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meeting info');
      }
      return response.json();
    },
    enabled: !!roomId,
  });
}
