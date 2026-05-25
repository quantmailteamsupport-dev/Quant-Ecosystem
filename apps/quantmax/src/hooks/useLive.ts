// ============================================================================
// QuantMax - useLive Hook
// Live streaming state: viewer management, gifts, chat, stream controls
// ============================================================================

import { useState, useCallback, useRef } from 'react';

interface LiveStream {
  id: string;
  hostId: string;
  title: string;
  category: string;
  viewerCount: number;
  isLive: boolean;
  startedAt: number;
  duration: number;
  totalGifts: number;
  totalDiamonds: number;
}

interface LiveViewer {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
  giftsGiven: number;
  isModerator: boolean;
}

interface LiveChat {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
  type: 'message' | 'gift' | 'system' | 'pinned';
}

interface LiveGift {
  id: string;
  fromUserId: string;
  fromUserName: string;
  giftType: string;
  diamonds: number;
  timestamp: number;
  combo: number;
}

interface StreamSettings {
  title: string;
  category: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isFlipped: boolean;
  effectsEnabled: boolean;
  chatEnabled: boolean;
  giftsEnabled: boolean;
}

interface UseLiveReturn {
  stream: LiveStream | null;
  viewers: LiveViewer[];
  chat: LiveChat[];
  recentGifts: LiveGift[];
  settings: StreamSettings;
  topGifters: { userId: string; name: string; diamonds: number }[];
  isStreaming: boolean;
  startStream: (title: string, category: string) => void;
  endStream: () => void;
  updateSettings: (updates: Partial<StreamSettings>) => void;
  sendChat: (message: string) => void;
  pinMessage: (messageId: string) => void;
  banViewer: (viewerId: string) => void;
  muteViewer: (viewerId: string) => void;
}

export function useLive(userId: string): UseLiveReturn {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [viewers, setViewers] = useState<LiveViewer[]>([]);
  const [chat, setChat] = useState<LiveChat[]>([]);
  const [recentGifts, setRecentGifts] = useState<LiveGift[]>([]);
  const [settings, setSettings] = useState<StreamSettings>({
    title: '', category: 'Just Chatting', isMuted: false, isCameraOn: true,
    isFlipped: false, effectsEnabled: false, chatEnabled: true, giftsEnabled: true,
  });

  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewerSimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topGifters = recentGifts.reduce((acc, gift) => {
    const existing = acc.find(g => g.userId === gift.fromUserId);
    if (existing) existing.diamonds += gift.diamonds;
    else acc.push({ userId: gift.fromUserId, name: gift.fromUserName, diamonds: gift.diamonds });
    return acc;
  }, [] as { userId: string; name: string; diamonds: number }[]).sort((a, b) => b.diamonds - a.diamonds).slice(0, 10);

  const startStream = useCallback((title: string, category: string) => {
    const newStream: LiveStream = {
      id: `stream-${Date.now()}`, hostId: userId, title, category,
      viewerCount: 0, isLive: true, startedAt: Date.now(), duration: 0,
      totalGifts: 0, totalDiamonds: 0,
    };
    setStream(newStream);
    setSettings(prev => ({ ...prev, title, category }));
    setChat([{ id: 'sys-1', userId: 'system', userName: 'System', message: 'Stream started!', timestamp: Date.now(), type: 'system' }]);

    durationRef.current = setInterval(() => {
      setStream(prev => prev ? { ...prev, duration: Math.floor((Date.now() - prev.startedAt) / 1000) } : null);
    }, 1000);

    viewerSimRef.current = setInterval(() => {
      const shouldAdd = Math.random() > 0.4;
      if (shouldAdd) {
        const viewer: LiveViewer = { id: `v-${Date.now()}`, name: `User${Math.floor(Math.random() * 1000)}`, avatar: '', joinedAt: Date.now(), giftsGiven: 0, isModerator: false };
        setViewers(prev => [...prev, viewer]);
        setStream(prev => prev ? { ...prev, viewerCount: prev.viewerCount + 1 } : null);
      }
      if (Math.random() > 0.6) {
        const chatMsg: LiveChat = { id: `chat-${Date.now()}`, userId: `v-${Date.now()}`, userName: `User${Math.floor(Math.random() * 100)}`, message: ['Great stream!', 'Love this!', 'Hello everyone!', 'Keep going!'][Math.floor(Math.random() * 4)], timestamp: Date.now(), type: 'message' };
        setChat(prev => [...prev.slice(-100), chatMsg]);
      }
      if (Math.random() > 0.85) {
        const gifts = ['rose', 'heart', 'rocket', 'diamond'];
        const diamonds = [1, 5, 50, 100];
        const idx = Math.floor(Math.random() * gifts.length);
        const gift: LiveGift = { id: `gift-${Date.now()}`, fromUserId: `v-${Date.now()}`, fromUserName: `User${Math.floor(Math.random() * 100)}`, giftType: gifts[idx], diamonds: diamonds[idx], timestamp: Date.now(), combo: 1 };
        setRecentGifts(prev => [...prev.slice(-50), gift]);
        setStream(prev => prev ? { ...prev, totalGifts: prev.totalGifts + 1, totalDiamonds: prev.totalDiamonds + gift.diamonds } : null);
      }
    }, 3000);
  }, [userId]);

  const endStream = useCallback(() => {
    if (durationRef.current) clearInterval(durationRef.current);
    if (viewerSimRef.current) clearInterval(viewerSimRef.current);
    setStream(prev => prev ? { ...prev, isLive: false } : null);
  }, []);

  const updateSettings = useCallback((updates: Partial<StreamSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const sendChat = useCallback((message: string) => {
    const msg: LiveChat = { id: `chat-${Date.now()}`, userId, userName: 'You', message, timestamp: Date.now(), type: 'message' };
    setChat(prev => [...prev, msg]);
  }, [userId]);

  const pinMessage = useCallback((messageId: string) => {
    setChat(prev => prev.map(m => m.id === messageId ? { ...m, type: 'pinned' as const } : m));
  }, []);

  const banViewer = useCallback((viewerId: string) => {
    setViewers(prev => prev.filter(v => v.id !== viewerId));
    setStream(prev => prev ? { ...prev, viewerCount: Math.max(0, prev.viewerCount - 1) } : null);
  }, []);

  const muteViewer = useCallback((viewerId: string) => {
    console.log(`Muted viewer: ${viewerId}`);
  }, []);

  return { stream, viewers, chat, recentGifts, settings, topGifters, isStreaming: stream?.isLive || false, startStream, endStream, updateSettings, sendChat, pinMessage, banViewer, muteViewer };
}

export default useLive;
