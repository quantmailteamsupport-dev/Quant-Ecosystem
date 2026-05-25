// ============================================================================
// QuantMax - useMatching Hook
// Dating state: profile queue loading/management, swipe actions (like returns
// match probability, pass removes, super-like with daily limit), match detection
// with celebration trigger, unmatch flow, preference updates, boost activation,
// undo last action, queue refill trigger
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface MatchProfile {
  id: string;
  displayName: string;
  age: number;
  photos: string[];
  bio: string;
  interests: string[];
  distance: number;
  job?: string;
  school?: string;
  verified: boolean;
  promptAnswers: { question: string; answer: string }[];
  lastActive: number;
}

interface MatchPreferences {
  ageRange: { min: number; max: number };
  maxDistance: number;
  genderPreference: 'male' | 'female' | 'everyone';
  showVerifiedOnly: boolean;
}

interface SwipeResult {
  action: 'like' | 'pass' | 'superlike';
  profileId: string;
  matchProbability: number;
  isMatch: boolean;
  timestamp: number;
}

interface MatchRecord {
  id: string;
  matchedProfile: MatchProfile;
  matchedAt: number;
  lastMessage?: string;
  unread: boolean;
}

interface BoostState {
  isActive: boolean;
  expiresAt: number;
  multiplier: number;
  remainingBoosts: number;
}

interface UndoAction {
  profile: MatchProfile;
  action: 'like' | 'pass' | 'superlike';
  timestamp: number;
}

interface MatchingState {
  queue: MatchProfile[];
  isLoading: boolean;
  matches: MatchRecord[];
  swipeHistory: SwipeResult[];
  preferences: MatchPreferences;
  dailySuperLikes: { used: number; max: number; resetsAt: number };
  dailyLikes: { used: number; max: number; resetsAt: number };
  boost: BoostState;
  lastUndo: UndoAction | null;
  error: string | null;
}

interface UseMatchingReturn {
  state: MatchingState;
  currentProfile: MatchProfile | null;
  like: (profileId: string) => SwipeResult;
  pass: (profileId: string) => void;
  superLike: (profileId: string) => SwipeResult | null;
  undo: () => boolean;
  unmatch: (matchId: string) => void;
  updatePreferences: (prefs: Partial<MatchPreferences>) => void;
  activateBoost: () => boolean;
  refillQueue: () => void;
  canSuperLike: boolean;
  canUndo: boolean;
  isBoostActive: boolean;
  matchCelebration: MatchRecord | null;
  dismissCelebration: () => void;
}

const DEFAULT_PREFERENCES: MatchPreferences = {
  ageRange: { min: 18, max: 35 },
  maxDistance: 50,
  genderPreference: 'everyone',
  showVerifiedOnly: false,
};

const DAILY_SUPER_LIKE_MAX = 5;
const DAILY_LIKE_MAX = 100;
const QUEUE_REFILL_THRESHOLD = 5;
const MATCH_PROBABILITY_BASE = 0.15;

export function useMatching(): UseMatchingReturn {
  const [state, setState] = useState<MatchingState>({
    queue: [],
    isLoading: false,
    matches: [],
    swipeHistory: [],
    preferences: DEFAULT_PREFERENCES,
    dailySuperLikes: { used: 0, max: DAILY_SUPER_LIKE_MAX, resetsAt: Date.now() + 86400000 },
    dailyLikes: { used: 0, max: DAILY_LIKE_MAX, resetsAt: Date.now() + 86400000 },
    boost: { isActive: false, expiresAt: 0, multiplier: 1, remainingBoosts: 3 },
    lastUndo: null,
    error: null,
  });

  const [matchCelebration, setMatchCelebration] = useState<MatchRecord | null>(null);
  const boostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dailyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentProfile = useMemo(() => {
    return state.queue[0] || null;
  }, [state.queue]);

  const canSuperLike = useMemo(() => {
    return state.dailySuperLikes.used < state.dailySuperLikes.max;
  }, [state.dailySuperLikes]);

  const canUndo = useMemo(() => {
    return state.lastUndo !== null && (Date.now() - (state.lastUndo?.timestamp || 0)) < 30000;
  }, [state.lastUndo]);

  const isBoostActive = useMemo(() => {
    return state.boost.isActive && state.boost.expiresAt > Date.now();
  }, [state.boost]);

  // Calculate match probability based on shared interests and preferences
  const calculateMatchProbability = useCallback((profile: MatchProfile): number => {
    let probability = MATCH_PROBABILITY_BASE;

    // Interest overlap bonus
    const commonInterests = profile.interests.filter(i =>
      state.queue[0]?.interests?.includes(i) || false
    );
    probability += commonInterests.length * 0.05;

    // Boost multiplier
    if (isBoostActive) {
      probability *= state.boost.multiplier;
    }

    // Verified bonus
    if (profile.verified) {
      probability += 0.05;
    }

    // Activity recency bonus
    const hoursSinceActive = (Date.now() - profile.lastActive) / 3600000;
    if (hoursSinceActive < 1) probability += 0.1;
    else if (hoursSinceActive < 24) probability += 0.05;

    return Math.min(probability, 0.95);
  }, [state.queue, isBoostActive, state.boost.multiplier]);

  // Check if match occurs (simulated)
  const checkForMatch = useCallback((profileId: string, probability: number): boolean => {
    return Math.random() < probability;
  }, []);

  const like = useCallback((profileId: string): SwipeResult => {
    const profile = state.queue.find(p => p.id === profileId);
    const matchProb = profile ? calculateMatchProbability(profile) : 0;
    const isMatch = checkForMatch(profileId, matchProb);

    const result: SwipeResult = {
      action: 'like',
      profileId,
      matchProbability: matchProb,
      isMatch,
      timestamp: Date.now(),
    };

    setState(prev => {
      const removedProfile = prev.queue.find(p => p.id === profileId);
      const newQueue = prev.queue.filter(p => p.id !== profileId);
      const newMatches = [...prev.matches];

      if (isMatch && removedProfile) {
        const matchRecord: MatchRecord = {
          id: `match_${Date.now()}`,
          matchedProfile: removedProfile,
          matchedAt: Date.now(),
          unread: true,
        };
        newMatches.push(matchRecord);
        setMatchCelebration(matchRecord);
      }

      return {
        ...prev,
        queue: newQueue,
        matches: newMatches,
        swipeHistory: [...prev.swipeHistory, result],
        dailyLikes: { ...prev.dailyLikes, used: prev.dailyLikes.used + 1 },
        lastUndo: removedProfile ? { profile: removedProfile, action: 'like', timestamp: Date.now() } : null,
      };
    });

    return result;
  }, [state.queue, calculateMatchProbability, checkForMatch]);

  const pass = useCallback((profileId: string): void => {
    setState(prev => {
      const removedProfile = prev.queue.find(p => p.id === profileId);
      const newQueue = prev.queue.filter(p => p.id !== profileId);

      const result: SwipeResult = {
        action: 'pass',
        profileId,
        matchProbability: 0,
        isMatch: false,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        queue: newQueue,
        swipeHistory: [...prev.swipeHistory, result],
        lastUndo: removedProfile ? { profile: removedProfile, action: 'pass', timestamp: Date.now() } : null,
      };
    });
  }, []);

  const superLike = useCallback((profileId: string): SwipeResult | null => {
    if (!canSuperLike) return null;

    const profile = state.queue.find(p => p.id === profileId);
    const matchProb = profile ? Math.min(calculateMatchProbability(profile) * 3, 0.95) : 0;
    const isMatch = checkForMatch(profileId, matchProb);

    const result: SwipeResult = {
      action: 'superlike',
      profileId,
      matchProbability: matchProb,
      isMatch,
      timestamp: Date.now(),
    };

    setState(prev => {
      const removedProfile = prev.queue.find(p => p.id === profileId);
      const newQueue = prev.queue.filter(p => p.id !== profileId);
      const newMatches = [...prev.matches];

      if (isMatch && removedProfile) {
        const matchRecord: MatchRecord = {
          id: `match_${Date.now()}`,
          matchedProfile: removedProfile,
          matchedAt: Date.now(),
          unread: true,
        };
        newMatches.push(matchRecord);
        setMatchCelebration(matchRecord);
      }

      return {
        ...prev,
        queue: newQueue,
        matches: newMatches,
        swipeHistory: [...prev.swipeHistory, result],
        dailySuperLikes: { ...prev.dailySuperLikes, used: prev.dailySuperLikes.used + 1 },
        lastUndo: removedProfile ? { profile: removedProfile, action: 'superlike', timestamp: Date.now() } : null,
      };
    });

    return result;
  }, [canSuperLike, state.queue, calculateMatchProbability, checkForMatch]);

  const undo = useCallback((): boolean => {
    if (!canUndo || !state.lastUndo) return false;

    setState(prev => {
      if (!prev.lastUndo) return prev;
      return {
        ...prev,
        queue: [prev.lastUndo.profile, ...prev.queue],
        swipeHistory: prev.swipeHistory.slice(0, -1),
        lastUndo: null,
      };
    });

    return true;
  }, [canUndo, state.lastUndo]);

  const unmatch = useCallback((matchId: string): void => {
    setState(prev => ({
      ...prev,
      matches: prev.matches.filter(m => m.id !== matchId),
    }));
  }, []);

  const updatePreferences = useCallback((prefs: Partial<MatchPreferences>): void => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...prefs },
    }));
  }, []);

  const activateBoost = useCallback((): boolean => {
    if (state.boost.remainingBoosts <= 0) return false;

    const duration = 30 * 60 * 1000; // 30 minutes
    const expiresAt = Date.now() + duration;

    setState(prev => ({
      ...prev,
      boost: {
        isActive: true,
        expiresAt,
        multiplier: 3,
        remainingBoosts: prev.boost.remainingBoosts - 1,
      },
    }));

    boostTimerRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        boost: { ...prev.boost, isActive: false },
      }));
    }, duration);

    return true;
  }, [state.boost.remainingBoosts]);

  const refillQueue = useCallback((): void => {
    setState(prev => ({ ...prev, isLoading: true }));
    // Simulate API call to get more profiles
    setTimeout(() => {
      setState(prev => ({ ...prev, isLoading: false }));
    }, 1500);
  }, []);

  const dismissCelebration = useCallback((): void => {
    setMatchCelebration(null);
  }, []);

  // Auto-refill queue when low
  useEffect(() => {
    if (state.queue.length <= QUEUE_REFILL_THRESHOLD && !state.isLoading) {
      refillQueue();
    }
  }, [state.queue.length, state.isLoading, refillQueue]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (boostTimerRef.current) clearTimeout(boostTimerRef.current);
      if (dailyResetRef.current) clearTimeout(dailyResetRef.current);
    };
  }, []);

  return {
    state,
    currentProfile,
    like,
    pass,
    superLike,
    undo,
    unmatch,
    updatePreferences,
    activateBoost,
    refillQueue,
    canSuperLike,
    canUndo,
    isBoostActive,
    matchCelebration,
    dismissCelebration,
  };
}

export default useMatching;
