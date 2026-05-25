// ============================================================================
// QuantMax - useFeed Hook
// TikTok-style feed state management with preloading (next 2), current index,
// swipe tracking, like with debounce, engagement time per video, skip detection,
// watch completion rate, autoplay next, pause/resume, mute toggle
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface FeedVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  description: string;
  soundName: string;
  duration: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  hashtags: string[];
}

interface SwipeEvent {
  videoId: string;
  direction: 'up' | 'down';
  distance: number;
  timestamp: number;
}

interface EngagementData {
  videoId: string;
  watchTime: number;
  startTime: number;
  completionRate: number;
  loops: number;
  liked: boolean;
  skipped: boolean;
}

interface FeedState {
  videos: FeedVideo[];
  currentIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

interface UseFeedReturn {
  state: FeedState;
  currentVideo: FeedVideo | null;
  preloadedVideos: FeedVideo[];
  engagementData: Map<string, EngagementData>;
  swipeToNext: () => void;
  swipeToPrevious: () => void;
  toggleLike: () => void;
  toggleMute: () => void;
  togglePlay: () => void;
  loadMore: () => void;
  trackSwipe: (direction: 'up' | 'down', distance: number) => void;
  getCompletionRate: (videoId: string) => number;
  getSkipRate: () => number;
}

const PRELOAD_COUNT = 2;
const SKIP_THRESHOLD_SECONDS = 3;
const LIKE_DEBOUNCE_MS = 300;

export function useFeed(initialVideos: FeedVideo[] = []): UseFeedReturn {
  const [state, setState] = useState<FeedState>({
    videos: initialVideos,
    currentIndex: 0,
    isPlaying: true,
    isMuted: false,
    isLoading: false,
    hasMore: true,
    error: null,
  });

  const [engagementData, setEngagementData] = useState<Map<string, EngagementData>>(new Map());
  const [swipeHistory, setSwipeHistory] = useState<SwipeEvent[]>([]);

  const watchStartRef = useRef<number>(Date.now());
  const likeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engagementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopCountRef = useRef<number>(0);

  const currentVideo = useMemo(() => {
    return state.videos[state.currentIndex] || null;
  }, [state.videos, state.currentIndex]);

  const preloadedVideos = useMemo(() => {
    const start = state.currentIndex + 1;
    const end = Math.min(start + PRELOAD_COUNT, state.videos.length);
    return state.videos.slice(start, end);
  }, [state.videos, state.currentIndex]);

  // Track engagement time per video
  useEffect(() => {
    if (!currentVideo) return;

    watchStartRef.current = Date.now();
    loopCountRef.current = 0;

    // Initialize engagement data for this video
    setEngagementData(prev => {
      const next = new Map(prev);
      if (!next.has(currentVideo.id)) {
        next.set(currentVideo.id, {
          videoId: currentVideo.id,
          watchTime: 0,
          startTime: Date.now(),
          completionRate: 0,
          loops: 0,
          liked: currentVideo.isLiked,
          skipped: false,
        });
      }
      return next;
    });

    // Update engagement every second
    engagementTimerRef.current = setInterval(() => {
      if (!state.isPlaying) return;
      const elapsed = (Date.now() - watchStartRef.current) / 1000;
      setEngagementData(prev => {
        const next = new Map(prev);
        const data = next.get(currentVideo.id);
        if (data) {
          const totalWatch = elapsed + (data.loops * currentVideo.duration);
          const completion = currentVideo.duration > 0
            ? Math.min(elapsed / currentVideo.duration, 1)
            : 0;
          next.set(currentVideo.id, {
            ...data,
            watchTime: totalWatch,
            completionRate: Math.max(data.completionRate, completion),
            loops: loopCountRef.current,
          });
        }
        return next;
      });
    }, 1000);

    return () => {
      if (engagementTimerRef.current) clearInterval(engagementTimerRef.current);
    };
  }, [currentVideo?.id, state.isPlaying]);

  // Check for skip when moving to next video
  const markSkipIfNeeded = useCallback((videoId: string) => {
    const elapsed = (Date.now() - watchStartRef.current) / 1000;
    if (elapsed < SKIP_THRESHOLD_SECONDS) {
      setEngagementData(prev => {
        const next = new Map(prev);
        const data = next.get(videoId);
        if (data) {
          next.set(videoId, { ...data, skipped: true });
        }
        return next;
      });
    }
  }, []);

  // Simulate video loop detection
  useEffect(() => {
    if (!currentVideo || !state.isPlaying) return;
    const loopInterval = setInterval(() => {
      const elapsed = (Date.now() - watchStartRef.current) / 1000;
      const expectedLoops = Math.floor(elapsed / currentVideo.duration);
      if (expectedLoops > loopCountRef.current) {
        loopCountRef.current = expectedLoops;
      }
    }, 500);
    return () => clearInterval(loopInterval);
  }, [currentVideo, state.isPlaying]);

  const swipeToNext = useCallback(() => {
    setState(prev => {
      if (prev.currentIndex >= prev.videos.length - 1) return prev;
      const currentId = prev.videos[prev.currentIndex]?.id;
      if (currentId) markSkipIfNeeded(currentId);
      return { ...prev, currentIndex: prev.currentIndex + 1, isPlaying: true };
    });
  }, [markSkipIfNeeded]);

  const swipeToPrevious = useCallback(() => {
    setState(prev => {
      if (prev.currentIndex <= 0) return prev;
      return { ...prev, currentIndex: prev.currentIndex - 1, isPlaying: true };
    });
  }, []);

  const toggleLike = useCallback(() => {
    if (likeDebounceRef.current) clearTimeout(likeDebounceRef.current);
    likeDebounceRef.current = setTimeout(() => {
      setState(prev => {
        const videos = [...prev.videos];
        const video = videos[prev.currentIndex];
        if (!video) return prev;
        videos[prev.currentIndex] = {
          ...video,
          isLiked: !video.isLiked,
          likes: video.isLiked ? video.likes - 1 : video.likes + 1,
        };
        return { ...prev, videos };
      });

      if (currentVideo) {
        setEngagementData(prev => {
          const next = new Map(prev);
          const data = next.get(currentVideo.id);
          if (data) {
            next.set(currentVideo.id, { ...data, liked: !data.liked });
          }
          return next;
        });
      }
    }, LIKE_DEBOUNCE_MS);
  }, [currentVideo]);

  const toggleMute = useCallback(() => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const togglePlay = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const loadMore = useCallback(() => {
    if (state.isLoading || !state.hasMore) return;
    setState(prev => ({ ...prev, isLoading: true }));
    // Simulate loading more videos
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        // In production, this would fetch from API
      }));
    }, 1000);
  }, [state.isLoading, state.hasMore]);

  const trackSwipe = useCallback((direction: 'up' | 'down', distance: number) => {
    if (!currentVideo) return;
    setSwipeHistory(prev => [...prev, {
      videoId: currentVideo.id,
      direction,
      distance,
      timestamp: Date.now(),
    }]);
    if (direction === 'up') {
      swipeToNext();
    } else if (direction === 'down') {
      swipeToPrevious();
    }
  }, [currentVideo, swipeToNext, swipeToPrevious]);

  const getCompletionRate = useCallback((videoId: string): number => {
    const data = engagementData.get(videoId);
    return data ? data.completionRate : 0;
  }, [engagementData]);

  const getSkipRate = useCallback((): number => {
    if (engagementData.size === 0) return 0;
    let skipped = 0;
    engagementData.forEach(data => {
      if (data.skipped) skipped++;
    });
    return skipped / engagementData.size;
  }, [engagementData]);

  // Auto-load more when approaching end
  useEffect(() => {
    if (state.currentIndex >= state.videos.length - 3 && state.hasMore && !state.isLoading) {
      loadMore();
    }
  }, [state.currentIndex, state.videos.length, state.hasMore, state.isLoading, loadMore]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (likeDebounceRef.current) clearTimeout(likeDebounceRef.current);
      if (engagementTimerRef.current) clearInterval(engagementTimerRef.current);
    };
  }, []);

  return {
    state,
    currentVideo,
    preloadedVideos,
    engagementData,
    swipeToNext,
    swipeToPrevious,
    toggleLike,
    toggleMute,
    togglePlay,
    loadMore,
    trackSwipe,
    getCompletionRate,
    getSkipRate,
  };
}

export default useFeed;
