// ============================================================================
// QuantMax - useNearby Hook
// Nearby people state: discovery, waves, filtering
// ============================================================================

import { useState, useCallback } from 'react';

interface NearbyPerson {
  id: string;
  name: string;
  age: number;
  avatar: string;
  distance: number;
  interests: string[];
  mutualInterests: string[];
  lastActive: number;
  hasWaved: boolean;
  waveReceived: boolean;
  bio: string;
}

interface Wave {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
}

interface NearbyFilters {
  maxDistance: number;
  ageMin: number;
  ageMax: number;
  interests: string[];
  onlineOnly: boolean;
}

interface UseNearbyReturn {
  people: NearbyPerson[];
  waves: Wave[];
  filters: NearbyFilters;
  isLoading: boolean;
  loadNearby: () => Promise<void>;
  sendWave: (userId: string) => void;
  acceptWave: (waveId: string) => void;
  declineWave: (waveId: string) => void;
  updateFilters: (updates: Partial<NearbyFilters>) => void;
  refreshLocation: () => Promise<void>;
}

const ALL_INTERESTS = ['Music', 'Sports', 'Gaming', 'Travel', 'Cooking', 'Art', 'Movies', 'Books', 'Fitness', 'Photography', 'Fashion', 'Tech'];

export function useNearby(userId: string, userInterests: string[]): UseNearbyReturn {
  const [people, setPeople] = useState<NearbyPerson[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [filters, setFilters] = useState<NearbyFilters>({ maxDistance: 25, ageMin: 18, ageMax: 50, interests: [], onlineOnly: false });
  const [isLoading, setIsLoading] = useState(false);

  const loadNearby = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const mockPeople: NearbyPerson[] = Array.from({ length: 20 }, (_, i) => {
      const personInterests = ALL_INTERESTS.slice(i % 4, i % 4 + 3 + Math.floor(Math.random() * 3));
      return {
        id: `nearby-${i}`, name: `${['Alex', 'Sam', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Drew', 'Quinn'][i % 8]}`, age: 20 + Math.floor(Math.random() * 15),
        avatar: `/avatars/nearby-${i}.jpg`, distance: Math.random() * 25, interests: personInterests,
        mutualInterests: personInterests.filter(int => userInterests.includes(int)),
        lastActive: Date.now() - Math.floor(Math.random() * 3600000), hasWaved: i === 2, waveReceived: i === 4 || i === 7,
        bio: ['Love outdoor adventures!', 'Coffee addict', 'Looking for new friends', 'Music is life', 'Gym rat'][i % 5],
      };
    }).filter(p => p.distance <= filters.maxDistance && p.age >= filters.ageMin && p.age <= filters.ageMax)
      .filter(p => filters.interests.length === 0 || filters.interests.some(i => p.interests.includes(i)))
      .sort((a, b) => a.distance - b.distance);
    setPeople(mockPeople);
    setWaves([
      { id: 'wave-1', fromUserId: 'nearby-4', fromUserName: 'Casey', fromUserAvatar: '/avatars/nearby-4.jpg', timestamp: Date.now() - 600000, status: 'pending' },
      { id: 'wave-2', fromUserId: 'nearby-7', fromUserName: 'Quinn', fromUserAvatar: '/avatars/nearby-7.jpg', timestamp: Date.now() - 1800000, status: 'pending' },
    ]);
    setIsLoading(false);
  }, [filters, userInterests]);

  const sendWave = useCallback((targetId: string) => {
    setPeople(prev => prev.map(p => p.id === targetId ? { ...p, hasWaved: true } : p));
  }, []);

  const acceptWave = useCallback((waveId: string) => {
    setWaves(prev => prev.map(w => w.id === waveId ? { ...w, status: 'accepted' } : w));
  }, []);

  const declineWave = useCallback((waveId: string) => {
    setWaves(prev => prev.map(w => w.id === waveId ? { ...w, status: 'declined' } : w));
  }, []);

  const updateFilters = useCallback((updates: Partial<NearbyFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const refreshLocation = useCallback(async () => {
    await loadNearby();
  }, [loadNearby]);

  return { people, waves, filters, isLoading, loadNearby, sendWave, acceptWave, declineWave, updateFilters, refreshLocation };
}

export default useNearby;
