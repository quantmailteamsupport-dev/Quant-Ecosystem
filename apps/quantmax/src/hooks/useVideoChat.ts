// ============================================================================
// QuantMax - useVideoChat Hook
// WebRTC-style state: peer connection state machine (idle/searching/connecting/
// connected/disconnected), ICE candidates list, local/remote media stream refs,
// interest-based matching queue, skip/reconnect actions, quality monitoring,
// timer tracking, message sending/receiving for text chat
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

type ConnectionState = 'idle' | 'searching' | 'connecting' | 'connected' | 'disconnected';

interface ICECandidate {
  id: string;
  candidate: string;
  sdpMid: string;
  sdpMLineIndex: number;
  timestamp: number;
}

interface MediaStreamRef {
  id: string;
  active: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  tracks: { kind: 'audio' | 'video'; enabled: boolean; id: string }[];
}

interface RemotePeer {
  id: string;
  displayName: string;
  interests: string[];
  avatarUrl: string;
  age?: number;
  location?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  delivered: boolean;
  read: boolean;
}

interface QualityMetrics {
  bitrate: number;
  frameRate: number;
  resolution: { width: number; height: number };
  packetLoss: number;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface VideoChatState {
  connectionState: ConnectionState;
  iceCandidates: ICECandidate[];
  localStream: MediaStreamRef | null;
  remoteStream: MediaStreamRef | null;
  remotePeer: RemotePeer | null;
  messages: ChatMessage[];
  qualityMetrics: QualityMetrics;
  sessionDuration: number;
  matchingInterests: string[];
  isAudioMuted: boolean;
  isVideoOff: boolean;
  error: string | null;
}

interface UseVideoChatOptions {
  userInterests: string[];
  userId: string;
  userName: string;
}

interface UseVideoChatReturn {
  state: VideoChatState;
  startSearching: () => void;
  skip: () => void;
  disconnect: () => void;
  reconnect: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  sendMessage: (text: string) => void;
  getQualityLevel: () => number;
  connectionDuration: number;
}

const INITIAL_QUALITY: QualityMetrics = {
  bitrate: 2500,
  frameRate: 30,
  resolution: { width: 1280, height: 720 },
  packetLoss: 0,
  latency: 50,
  quality: 'excellent',
};

export function useVideoChat(options: UseVideoChatOptions): UseVideoChatReturn {
  const [state, setState] = useState<VideoChatState>({
    connectionState: 'idle',
    iceCandidates: [],
    localStream: null,
    remoteStream: null,
    remotePeer: null,
    messages: [],
    qualityMetrics: INITIAL_QUALITY,
    sessionDuration: 0,
    matchingInterests: [],
    isAudioMuted: false,
    isVideoOff: false,
    error: null,
  });

  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qualityMonitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageIdRef = useRef<number>(0);

  const connectionDuration = useMemo(() => state.sessionDuration, [state.sessionDuration]);

  // Initialize local stream
  const initializeLocalStream = useCallback((): MediaStreamRef => {
    return {
      id: `local_${Date.now()}`,
      active: true,
      audioEnabled: true,
      videoEnabled: true,
      tracks: [
        { kind: 'audio', enabled: true, id: `audio_${Date.now()}` },
        { kind: 'video', enabled: true, id: `video_${Date.now()}` },
      ],
    };
  }, []);

  // Generate ICE candidates (simulated)
  const generateICECandidates = useCallback((): ICECandidate[] => {
    const candidates: ICECandidate[] = [];
    const types = ['host', 'srflx', 'relay'];
    for (let i = 0; i < 3; i++) {
      candidates.push({
        id: `ice_${Date.now()}_${i}`,
        candidate: `candidate:${i} 1 udp 2113937151 192.168.1.${100 + i} ${50000 + i} typ ${types[i]}`,
        sdpMid: '0',
        sdpMLineIndex: 0,
        timestamp: Date.now(),
      });
    }
    return candidates;
  }, []);

  // Calculate quality level (1-5)
  const getQualityLevel = useCallback((): number => {
    const { packetLoss, latency, bitrate } = state.qualityMetrics;
    let score = 5;
    if (packetLoss > 5) score -= 2;
    else if (packetLoss > 2) score -= 1;
    if (latency > 200) score -= 2;
    else if (latency > 100) score -= 1;
    if (bitrate < 500) score -= 2;
    else if (bitrate < 1000) score -= 1;
    return Math.max(1, Math.min(5, score));
  }, [state.qualityMetrics]);

  // Determine quality label
  const determineQuality = useCallback((metrics: QualityMetrics): QualityMetrics['quality'] => {
    if (metrics.packetLoss < 1 && metrics.latency < 50) return 'excellent';
    if (metrics.packetLoss < 3 && metrics.latency < 100) return 'good';
    if (metrics.packetLoss < 5 && metrics.latency < 200) return 'fair';
    return 'poor';
  }, []);

  // Start quality monitoring
  const startQualityMonitoring = useCallback(() => {
    qualityMonitorRef.current = setInterval(() => {
      setState(prev => {
        if (prev.connectionState !== 'connected') return prev;
        // Simulate quality fluctuations
        const bitrateJitter = (Math.random() - 0.5) * 200;
        const latencyJitter = (Math.random() - 0.5) * 20;
        const packetLossJitter = Math.random() * 0.5;

        const newMetrics: QualityMetrics = {
          bitrate: Math.max(300, Math.min(3000, prev.qualityMetrics.bitrate + bitrateJitter)),
          frameRate: Math.random() > 0.9 ? 25 : 30,
          resolution: prev.qualityMetrics.resolution,
          packetLoss: Math.max(0, Math.min(10, prev.qualityMetrics.packetLoss + packetLossJitter)),
          latency: Math.max(10, Math.min(300, prev.qualityMetrics.latency + latencyJitter)),
          quality: 'good',
        };
        newMetrics.quality = determineQuality(newMetrics);

        return { ...prev, qualityMetrics: newMetrics };
      });
    }, 2000);
  }, [determineQuality]);

  // Start session duration timer
  const startDurationTimer = useCallback(() => {
    durationTimerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.connectionState !== 'connected') return prev;
        return { ...prev, sessionDuration: prev.sessionDuration + 1 };
      });
    }, 1000);
  }, []);

  const startSearching = useCallback(() => {
    const localStream = initializeLocalStream();
    const candidates = generateICECandidates();

    setState(prev => ({
      ...prev,
      connectionState: 'searching',
      localStream,
      iceCandidates: candidates,
      remotePeer: null,
      remoteStream: null,
      messages: [],
      sessionDuration: 0,
      error: null,
    }));

    // Simulate finding a match (2-5 seconds)
    const searchTime = 2000 + Math.random() * 3000;
    searchTimerRef.current = setTimeout(() => {
      // Transition to connecting
      setState(prev => ({
        ...prev,
        connectionState: 'connecting',
      }));

      // Simulate connection establishment (1-2 seconds)
      connectTimerRef.current = setTimeout(() => {
        const matchedInterests = options.userInterests.filter(() => Math.random() > 0.5);
        const remotePeer: RemotePeer = {
          id: `peer_${Date.now()}`,
          displayName: `User_${Math.floor(Math.random() * 9999)}`,
          interests: matchedInterests.length > 0 ? matchedInterests : [options.userInterests[0] || 'General'],
          avatarUrl: '/avatars/default.jpg',
          age: 18 + Math.floor(Math.random() * 20),
          location: 'Nearby',
        };

        const remoteStream: MediaStreamRef = {
          id: `remote_${Date.now()}`,
          active: true,
          audioEnabled: true,
          videoEnabled: true,
          tracks: [
            { kind: 'audio', enabled: true, id: `r_audio_${Date.now()}` },
            { kind: 'video', enabled: true, id: `r_video_${Date.now()}` },
          ],
        };

        setState(prev => ({
          ...prev,
          connectionState: 'connected',
          remotePeer,
          remoteStream,
          matchingInterests: matchedInterests,
          qualityMetrics: INITIAL_QUALITY,
        }));

        startQualityMonitoring();
        startDurationTimer();
      }, 1000 + Math.random() * 1000);
    }, searchTime);
  }, [options.userInterests, initializeLocalStream, generateICECandidates, startQualityMonitoring, startDurationTimer]);

  const skip = useCallback(() => {
    // Cleanup current connection
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (qualityMonitorRef.current) clearInterval(qualityMonitorRef.current);

    setState(prev => ({
      ...prev,
      connectionState: 'searching',
      remotePeer: null,
      remoteStream: null,
      messages: [],
      sessionDuration: 0,
    }));

    // Start searching for next person
    const searchTime = 1000 + Math.random() * 2000;
    searchTimerRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, connectionState: 'connecting' }));

      connectTimerRef.current = setTimeout(() => {
        const matchedInterests = options.userInterests.filter(() => Math.random() > 0.5);
        const remotePeer: RemotePeer = {
          id: `peer_${Date.now()}`,
          displayName: `User_${Math.floor(Math.random() * 9999)}`,
          interests: matchedInterests.length > 0 ? matchedInterests : ['General'],
          avatarUrl: '/avatars/default.jpg',
          age: 18 + Math.floor(Math.random() * 20),
        };

        const remoteStream: MediaStreamRef = {
          id: `remote_${Date.now()}`,
          active: true,
          audioEnabled: true,
          videoEnabled: true,
          tracks: [
            { kind: 'audio', enabled: true, id: `r_audio_${Date.now()}` },
            { kind: 'video', enabled: true, id: `r_video_${Date.now()}` },
          ],
        };

        setState(prev => ({
          ...prev,
          connectionState: 'connected',
          remotePeer,
          remoteStream,
          matchingInterests: matchedInterests,
          qualityMetrics: INITIAL_QUALITY,
        }));

        startQualityMonitoring();
        startDurationTimer();
      }, 1000);
    }, searchTime);
  }, [options.userInterests, startQualityMonitoring, startDurationTimer]);

  const disconnect = useCallback(() => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    if (qualityMonitorRef.current) clearInterval(qualityMonitorRef.current);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);

    setState(prev => ({
      ...prev,
      connectionState: 'disconnected',
      remoteStream: prev.remoteStream ? { ...prev.remoteStream, active: false } : null,
    }));
  }, []);

  const reconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      connectionState: 'idle',
      remotePeer: null,
      remoteStream: null,
      messages: [],
      sessionDuration: 0,
    }));
    startSearching();
  }, [startSearching]);

  const toggleAudio = useCallback(() => {
    setState(prev => {
      const muted = !prev.isAudioMuted;
      const localStream = prev.localStream ? {
        ...prev.localStream,
        audioEnabled: !muted,
        tracks: prev.localStream.tracks.map(t =>
          t.kind === 'audio' ? { ...t, enabled: !muted } : t
        ),
      } : null;
      return { ...prev, isAudioMuted: muted, localStream };
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setState(prev => {
      const off = !prev.isVideoOff;
      const localStream = prev.localStream ? {
        ...prev.localStream,
        videoEnabled: !off,
        tracks: prev.localStream.tracks.map(t =>
          t.kind === 'video' ? { ...t, enabled: !off } : t
        ),
      } : null;
      return { ...prev, isVideoOff: off, localStream };
    });
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || state.connectionState !== 'connected') return;

    messageIdRef.current += 1;
    const message: ChatMessage = {
      id: `msg_${messageIdRef.current}`,
      senderId: options.userId,
      text: text.trim(),
      timestamp: Date.now(),
      delivered: true,
      read: false,
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));

    // Simulate received read receipt
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === message.id ? { ...m, read: true } : m
        ),
      }));
    }, 1000 + Math.random() * 2000);
  }, [state.connectionState, options.userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (qualityMonitorRef.current) clearInterval(qualityMonitorRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    };
  }, []);

  return {
    state,
    startSearching,
    skip,
    disconnect,
    reconnect,
    toggleAudio,
    toggleVideo,
    sendMessage,
    getQualityLevel,
    connectionDuration,
  };
}

export default useVideoChat;
