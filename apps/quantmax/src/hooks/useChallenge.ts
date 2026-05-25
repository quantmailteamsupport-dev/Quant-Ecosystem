// ============================================================================
// QuantMax - useChallenge Hook
// Challenge state: active challenges, submissions, leaderboard
// ============================================================================

import { useState, useCallback } from 'react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  hashtag: string;
  banner: string;
  creatorId: string;
  creatorName: string;
  prize: string;
  startDate: number;
  endDate: number;
  submissionCount: number;
  participantCount: number;
  status: 'upcoming' | 'active' | 'ended';
  rules: string[];
}

interface Submission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  videoUrl: string;
  thumbnail: string;
  likes: number;
  comments: number;
  shares: number;
  score: number;
  rank: number;
  submittedAt: number;
}

interface UseChallengeReturn {
  challenges: Challenge[];
  activeChallenge: Challenge | null;
  submissions: Submission[];
  leaderboard: Submission[];
  isLoading: boolean;
  loadChallenges: () => Promise<void>;
  selectChallenge: (id: string) => void;
  participate: (challengeId: string, videoUrl: string) => Promise<void>;
  loadLeaderboard: (challengeId: string) => Promise<void>;
}

export function useChallenge(): UseChallengeReturn {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChallenges = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const mockChallenges: Challenge[] = Array.from({ length: 6 }, (_, i) => ({
      id: `challenge-${i}`, title: ['Dance Off', 'Cooking 60s', 'Pet Tricks', 'Outfit Change', 'Lip Sync Battle', 'Comedy Skit'][i],
      description: `Show us your best ${['dance moves', 'quick recipe', 'pet trick', 'outfit transition', 'lip sync', 'comedy skit'][i]}!`,
      hashtag: `#${['DanceOff', 'Cook60', 'PetTrick', 'OutfitSwap', 'LipSync', 'ComedyKing'][i]}`,
      banner: `/challenges/banner-${i}.jpg`, creatorId: `creator-${i}`, creatorName: `Creator${i + 1}`,
      prize: ['$1000', '$500', '$250', '$750', '$1500', '$300'][i],
      startDate: Date.now() - (i < 3 ? 86400000 * 2 : -86400000), endDate: Date.now() + 86400000 * (7 - i),
      submissionCount: Math.floor(Math.random() * 5000) + 100, participantCount: Math.floor(Math.random() * 2000) + 50,
      status: i < 4 ? 'active' : i < 5 ? 'upcoming' : 'ended', rules: ['Be original', 'Keep it under 60 seconds', 'Use the official sound'],
    }));
    setChallenges(mockChallenges);
    setIsLoading(false);
  }, []);

  const selectChallenge = useCallback((id: string) => {
    const challenge = challenges.find(c => c.id === id);
    setActiveChallenge(challenge || null);
    if (challenge) loadLeaderboard(challenge.id);
  }, [challenges]);

  const participate = useCallback(async (challengeId: string, videoUrl: string) => {
    await new Promise(r => setTimeout(r, 300));
    const submission: Submission = { id: `sub-${Date.now()}`, challengeId, userId: 'current-user', userName: 'You', videoUrl, thumbnail: '', likes: 0, comments: 0, shares: 0, score: 0, rank: submissions.length + 1, submittedAt: Date.now() };
    setSubmissions(prev => [...prev, submission]);
    setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, submissionCount: c.submissionCount + 1, participantCount: c.participantCount + 1 } : c));
  }, [submissions]);

  const loadLeaderboard = useCallback(async (challengeId: string) => {
    await new Promise(r => setTimeout(r, 300));
    const mockLeaderboard: Submission[] = Array.from({ length: 20 }, (_, i) => ({
      id: `lb-${i}`, challengeId, userId: `user-${i}`, userName: `Creator${i + 1}`, videoUrl: '', thumbnail: `/lb/thumb-${i}.jpg`,
      likes: Math.floor(Math.random() * 10000) + 500, comments: Math.floor(Math.random() * 1000) + 50, shares: Math.floor(Math.random() * 500) + 10,
      score: 0, rank: i + 1, submittedAt: Date.now() - i * 3600000,
    })).map(s => ({ ...s, score: s.likes + s.comments * 2 + s.shares * 5 })).sort((a, b) => b.score - a.score).map((s, i) => ({ ...s, rank: i + 1 }));
    setLeaderboard(mockLeaderboard);
  }, []);

  return { challenges, activeChallenge, submissions, leaderboard, isLoading, loadChallenges, selectChallenge, participate, loadLeaderboard };
}

export default useChallenge;
