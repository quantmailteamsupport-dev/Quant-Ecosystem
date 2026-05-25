// ============================================================================
// QuantMax - Video Creator Component
// Full video creation with camera placeholder, effects gallery, speed controls,
// countdown timer, align ghost overlay, music beat sync, record button with
// progress ring, gallery import
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface EffectItem {
  id: string;
  name: string;
  thumbnail: string;
  category: 'beauty' | 'funny' | 'world' | 'trending' | 'green_screen';
}

interface SpeedOption {
  label: string;
  value: number;
}

interface CountdownOption {
  label: string;
  seconds: number;
}

interface VideoCreatorProps {
  onRecordStart: () => void;
  onRecordStop: (duration: number) => void;
  onGalleryImport: () => void;
  onEffectSelect: (effectId: string) => void;
  maxDuration?: number;
}

interface RecordingState {
  isRecording: boolean;
  duration: number;
  segments: number[];
  currentSegmentStart: number;
}

const SPEED_OPTIONS: SpeedOption[] = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '3x', value: 3 },
];

const COUNTDOWN_OPTIONS: CountdownOption[] = [
  { label: 'Off', seconds: 0 },
  { label: '3s', seconds: 3 },
  { label: '10s', seconds: 10 },
];

const EFFECTS: EffectItem[] = [
  { id: 'beauty-1', name: 'Smooth', thumbnail: '/effects/smooth.jpg', category: 'beauty' },
  { id: 'beauty-2', name: 'Glow', thumbnail: '/effects/glow.jpg', category: 'beauty' },
  { id: 'funny-1', name: 'Big Head', thumbnail: '/effects/bighead.jpg', category: 'funny' },
  { id: 'funny-2', name: 'Distort', thumbnail: '/effects/distort.jpg', category: 'funny' },
  { id: 'world-1', name: 'Rain', thumbnail: '/effects/rain.jpg', category: 'world' },
  { id: 'world-2', name: 'Snow', thumbnail: '/effects/snow.jpg', category: 'world' },
  { id: 'trend-1', name: 'Vintage', thumbnail: '/effects/vintage.jpg', category: 'trending' },
  { id: 'trend-2', name: 'Neon', thumbnail: '/effects/neon.jpg', category: 'trending' },
  { id: 'gs-1', name: 'Beach', thumbnail: '/effects/beach.jpg', category: 'green_screen' },
  { id: 'gs-2', name: 'Space', thumbnail: '/effects/space.jpg', category: 'green_screen' },
];

const EFFECT_CATEGORIES = ['beauty', 'funny', 'world', 'trending', 'green_screen'] as const;

export const VideoCreator: React.FC<VideoCreatorProps> = ({
  onRecordStart,
  onRecordStop,
  onGalleryImport,
  onEffectSelect,
  maxDuration = 60,
}) => {
  const [showEffects, setShowEffects] = useState<boolean>(false);
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null);
  const [effectCategory, setEffectCategory] = useState<typeof EFFECT_CATEGORIES[number]>('beauty');
  const [speed, setSpeed] = useState<number>(1);
  const [countdown, setCountdown] = useState<number>(0);
  const [countdownActive, setCountdownActive] = useState<boolean>(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [alignGhost, setAlignGhost] = useState<boolean>(false);
  const [musicBeatSync, setMusicBeatSync] = useState<boolean>(false);
  const [beatPulse, setBeatPulse] = useState<boolean>(false);
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    segments: [],
    currentSegmentStart: 0,
  });
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalRecorded = useMemo(() => {
    const segmentTotal = recording.segments.reduce((sum, s) => sum + s, 0);
    return segmentTotal + recording.duration;
  }, [recording.segments, recording.duration]);

  const progressPercent = useMemo(() => {
    return Math.min((totalRecorded / maxDuration) * 100, 100);
  }, [totalRecorded, maxDuration]);

  const countdownProgressPercent = useMemo(() => {
    if (countdown === 0) return 0;
    return ((countdown - countdownRemaining) / countdown) * 100;
  }, [countdown, countdownRemaining]);

  const filteredEffects = useMemo(() => {
    return EFFECTS.filter(e => e.category === effectCategory);
  }, [effectCategory]);

  useEffect(() => {
    if (musicBeatSync) {
      beatTimerRef.current = setInterval(() => {
        setBeatPulse(true);
        setTimeout(() => setBeatPulse(false), 150);
      }, 500);
    }
    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [musicBeatSync]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, []);

  const startCountdown = useCallback(() => {
    if (countdown === 0) {
      startRecording();
      return;
    }
    setCountdownActive(true);
    setCountdownRemaining(countdown);
    countdownTimerRef.current = setInterval(() => {
      setCountdownRemaining(prev => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setCountdownActive(false);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [countdown]);

  const startRecording = useCallback(() => {
    setRecording(prev => ({
      ...prev,
      isRecording: true,
      currentSegmentStart: Date.now(),
      duration: 0,
    }));
    onRecordStart();
    recordingTimerRef.current = setInterval(() => {
      setRecording(prev => {
        const elapsed = (Date.now() - prev.currentSegmentStart) / 1000;
        const segmentTotal = prev.segments.reduce((sum, s) => sum + s, 0);
        if (segmentTotal + elapsed >= maxDuration) {
          stopRecording();
          return prev;
        }
        return { ...prev, duration: elapsed };
      });
    }, 100);
  }, [onRecordStart, maxDuration]);

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(prev => {
      const segmentDuration = (Date.now() - prev.currentSegmentStart) / 1000;
      const newSegments = [...prev.segments, segmentDuration];
      const totalDuration = newSegments.reduce((sum, s) => sum + s, 0);
      onRecordStop(totalDuration);
      return {
        ...prev,
        isRecording: false,
        duration: 0,
        segments: newSegments,
      };
    });
  }, [onRecordStop]);

  const handleRecordPress = useCallback(() => {
    if (recording.isRecording) {
      stopRecording();
    } else {
      startCountdown();
    }
  }, [recording.isRecording, stopRecording, startCountdown]);

  const handleEffectSelect = useCallback((effectId: string) => {
    setSelectedEffect(effectId);
    onEffectSelect(effectId);
  }, [onEffectSelect]);

  const toggleFlash = useCallback(() => {
    setFlashActive(prev => !prev);
  }, []);

  const flipCamera = useCallback(() => {
    setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      {/* Camera Placeholder View */}
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
          <p style={{ fontSize: '14px' }}>Camera Preview ({cameraFacing})</p>
          {alignGhost && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', opacity: 0.4, fontSize: '18px' }}>Ghost Overlay - Align to previous clip</span>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdownActive && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 50 }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#333" strokeWidth="6" />
              <circle
                cx="60" cy="60" r="54"
                fill="none" stroke="#ff2d55" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - countdownProgressPercent / 100)}`}
                transform="rotate(-90 60 60)"
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '48px', color: '#fff', fontWeight: 'bold' }}>
              {countdownRemaining}
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 16px', zIndex: 20 }}>
        <button onClick={toggleFlash} style={{ background: flashActive ? '#ffd700' : 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer' }}>
          ⚡
        </button>
        <button onClick={flipCamera} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer' }}>
          🔄
        </button>
      </div>

      {/* Right Side Controls */}
      <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 20 }}>
        <button onClick={() => setShowEffects(true)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '12px', padding: '10px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>
          ✨<br />Effects
        </button>
        <button onClick={() => setAlignGhost(!alignGhost)} style={{ background: alignGhost ? 'rgba(255,45,85,0.7)' : 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '12px', padding: '10px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>
          👻<br />Align
        </button>
        <button onClick={() => setMusicBeatSync(!musicBeatSync)} style={{ background: musicBeatSync ? 'rgba(255,45,85,0.7)' : 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '12px', padding: '10px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>
          🎵<br />Sync
        </button>
      </div>

      {/* Speed Controls */}
      <div style={{ position: 'absolute', bottom: '140px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 20 }}>
        {SPEED_OPTIONS.map(opt => (
          <button
            key={opt.label}
            onClick={() => setSpeed(opt.value)}
            style={{
              background: speed === opt.value ? '#ff2d55' : 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 14px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: speed === opt.value ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Countdown Timer Selection */}
      <div style={{ position: 'absolute', bottom: '110px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 20 }}>
        {COUNTDOWN_OPTIONS.map(opt => (
          <button
            key={opt.label}
            onClick={() => setCountdown(opt.seconds)}
            style={{
              background: countdown === opt.seconds ? '#ff2d55' : 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '12px',
              padding: '4px 10px',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Bottom Controls */}
      <div style={{ position: 'absolute', bottom: '24px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', zIndex: 20 }}>
        {/* Gallery Import */}
        <button onClick={onGalleryImport} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '12px', width: '48px', height: '48px', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>
          🖼
        </button>

        {/* Record Button with Progress Ring */}
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', top: 0, left: 0 }}>
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
            <circle
              cx="40" cy="40" r="36"
              fill="none" stroke="#ff2d55" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercent / 100)}`}
              transform="rotate(-90 40 40)"
              strokeLinecap="round"
            />
          </svg>
          <button
            onClick={handleRecordPress}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: recording.isRecording ? '32px' : '60px',
              height: recording.isRecording ? '32px' : '60px',
              borderRadius: recording.isRecording ? '8px' : '50%',
              background: '#ff2d55',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          />
        </div>

        {/* Music Beat Sync Indicator */}
        <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {musicBeatSync && (
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: beatPulse ? '#ff2d55' : '#666', transition: 'background 0.1s' }} />
          )}
        </div>
      </div>

      {/* Effects Gallery Overlay */}
      {showEffects && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'rgba(0,0,0,0.9)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '16px', zIndex: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>Effects</h3>
            <button onClick={() => setShowEffects(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto' }}>
            {EFFECT_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setEffectCategory(cat)}
                style={{
                  background: effectCategory === cat ? '#ff2d55' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '6px 14px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
          {/* Effects Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', overflowY: 'auto', maxHeight: 'calc(100% - 80px)' }}>
            {filteredEffects.map(effect => (
              <div
                key={effect.id}
                onClick={() => handleEffectSelect(effect.id)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '12px',
                  background: '#333',
                  border: selectedEffect === effect.id ? '2px solid #ff2d55' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>✨</div>
                <span style={{ color: '#ccc', fontSize: '10px', textAlign: 'center' }}>{effect.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCreator;
