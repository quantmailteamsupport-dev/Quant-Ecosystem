// ============================================================================
// QuantMax - Random Matcher Component
// Random matching UI with searching animation, interest match percentage,
// connection quality bars, auto-skip timer, connected user info
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface ConnectedUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  interests: string[];
  age?: number;
  location?: string;
}

interface RandomMatcherProps {
  onSkip: () => void;
  onConnect: (userId: string) => void;
  onDisconnect: () => void;
  matchedUser: ConnectedUser | null;
  connectionState: 'idle' | 'searching' | 'connecting' | 'connected' | 'reconnecting';
  userInterests: string[];
}

type AutoSkipOption = 30 | 60 | 0;

export const RandomMatcher: React.FC<RandomMatcherProps> = ({
  onSkip,
  onConnect,
  onDisconnect,
  matchedUser,
  connectionState,
  userInterests,
}) => {
  const [connectionQuality, setConnectionQuality] = useState<number>(5);
  const [autoSkipTime, setAutoSkipTime] = useState<AutoSkipOption>(0);
  const [autoSkipRemaining, setAutoSkipRemaining] = useState<number>(0);
  const [interestMatch, setInterestMatch] = useState<number>(0);
  const [searchDots, setSearchDots] = useState<number>(1);
  const [spinAngle, setSpinAngle] = useState<number>(0);
  const [connectionDuration, setConnectionDuration] = useState<number>(0);

  const autoSkipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate interest match percentage
  useEffect(() => {
    if (matchedUser && matchedUser.interests.length > 0) {
      const commonInterests = userInterests.filter(i =>
        matchedUser.interests.includes(i)
      );
      const totalUnique = new Set([...userInterests, ...matchedUser.interests]).size;
      const percentage = totalUnique > 0 ? Math.round((commonInterests.length / totalUnique) * 100) : 0;
      setInterestMatch(percentage);
    } else {
      setInterestMatch(0);
    }
  }, [matchedUser, userInterests]);

  // Search animation (dots)
  useEffect(() => {
    if (connectionState === 'searching' || connectionState === 'reconnecting') {
      searchAnimRef.current = setInterval(() => {
        setSearchDots(prev => prev >= 3 ? 1 : prev + 1);
      }, 500);
      spinAnimRef.current = setInterval(() => {
        setSpinAngle(prev => (prev + 6) % 360);
      }, 30);
    } else {
      if (searchAnimRef.current) clearInterval(searchAnimRef.current);
      if (spinAnimRef.current) clearInterval(spinAnimRef.current);
      setSpinAngle(0);
    }
    return () => {
      if (searchAnimRef.current) clearInterval(searchAnimRef.current);
      if (spinAnimRef.current) clearInterval(spinAnimRef.current);
    };
  }, [connectionState]);

  // Connection duration timer
  useEffect(() => {
    if (connectionState === 'connected') {
      setConnectionDuration(0);
      connectionTimerRef.current = setInterval(() => {
        setConnectionDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (connectionTimerRef.current) clearInterval(connectionTimerRef.current);
      setConnectionDuration(0);
    }
    return () => {
      if (connectionTimerRef.current) clearInterval(connectionTimerRef.current);
    };
  }, [connectionState]);

  // Auto-skip timer
  useEffect(() => {
    if (autoSkipTime > 0 && connectionState === 'connected') {
      setAutoSkipRemaining(autoSkipTime);
      autoSkipTimerRef.current = setInterval(() => {
        setAutoSkipRemaining(prev => {
          if (prev <= 1) {
            onSkip();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (autoSkipTimerRef.current) clearInterval(autoSkipTimerRef.current);
      setAutoSkipRemaining(0);
    }
    return () => {
      if (autoSkipTimerRef.current) clearInterval(autoSkipTimerRef.current);
    };
  }, [autoSkipTime, connectionState, onSkip]);

  // Simulate connection quality fluctuation
  useEffect(() => {
    if (connectionState === 'connected') {
      const qualityInterval = setInterval(() => {
        setConnectionQuality(prev => {
          const change = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
          return Math.min(5, Math.max(1, prev + change));
        });
      }, 3000);
      return () => clearInterval(qualityInterval);
    }
    return undefined;
  }, [connectionState]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const commonInterests = useMemo(() => {
    if (!matchedUser) return [];
    return userInterests.filter(i => matchedUser.interests.includes(i));
  }, [matchedUser, userInterests]);

  const handleAutoSkipChange = useCallback((value: AutoSkipOption) => {
    setAutoSkipTime(value);
  }, []);

  const renderSearching = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px' }}>
      {/* Spinning Animation */}
      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: `rotate(${spinAngle}deg)` }}>
          <circle cx="60" cy="60" r="54" fill="none" stroke="#333" strokeWidth="3" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="#ff2d55"
            strokeWidth="4"
            strokeDasharray="85 254"
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '32px' }}>
          🔍
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '18px' }}>
          {connectionState === 'reconnecting' ? 'Reconnecting' : 'Finding someone'}
          {'.'.repeat(searchDots)}
        </h3>
        <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>
          Based on your interests
        </p>
      </div>
    </div>
  );

  const renderConnecting = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
        🤝
      </div>
      <h3 style={{ color: '#fff', margin: 0 }}>Connecting...</h3>
    </div>
  );

  const renderConnected = () => {
    if (!matchedUser) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
        {/* Connected User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#444', backgroundImage: `url(${matchedUser.avatarUrl})`, backgroundSize: 'cover' }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '16px' }}>
              {matchedUser.displayName}{matchedUser.age ? `, ${matchedUser.age}` : ''}
            </h4>
            {matchedUser.location && (
              <p style={{ color: '#999', margin: 0, fontSize: '12px' }}>{matchedUser.location}</p>
            )}
          </div>
          {/* Connection Quality Bars */}
          <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '20px' }}>
            {[1, 2, 3, 4, 5].map(bar => (
              <div
                key={bar}
                style={{
                  width: '4px',
                  height: `${bar * 4}px`,
                  borderRadius: '2px',
                  background: bar <= connectionQuality ? '#4caf50' : '#333',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
        </div>

        {/* Interest Match Percentage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,45,85,0.1)', borderRadius: '8px', marginBottom: '12px' }}>
          <span style={{ color: '#ff2d55', fontWeight: 'bold', fontSize: '20px' }}>{interestMatch}%</span>
          <span style={{ color: '#ccc', fontSize: '13px' }}>interest match</span>
        </div>

        {/* Common Interests */}
        {commonInterests.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {commonInterests.map(interest => (
              <span key={interest} style={{ background: 'rgba(255,45,85,0.2)', color: '#ff6b8a', padding: '4px 10px', borderRadius: '12px', fontSize: '11px' }}>
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Video Area Placeholder */}
        <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>Video Stream</span>
        </div>

        {/* Duration and Auto-Skip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ color: '#999', fontSize: '13px' }}>
            Duration: {formatDuration(connectionDuration)}
          </span>
          {autoSkipTime > 0 && (
            <span style={{ color: '#ff9800', fontSize: '13px' }}>
              Auto-skip in {formatDuration(autoSkipRemaining)}
            </span>
          )}
        </div>

        {/* Auto-Skip Options */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <span style={{ color: '#999', fontSize: '12px', alignSelf: 'center' }}>Auto-skip:</span>
          {([30, 60, 0] as AutoSkipOption[]).map(opt => (
            <button
              key={opt}
              onClick={() => handleAutoSkipChange(opt)}
              style={{
                background: autoSkipTime === opt ? '#ff2d55' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '12px',
                padding: '4px 10px',
                color: '#fff',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              {opt === 0 ? 'Off' : `${opt}s`}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onSkip}
            style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          >
            Skip / Next →
          </button>
          <button
            onClick={onDisconnect}
            style={{ padding: '14px 20px', background: '#ff4458', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          >
            End
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a0a', borderRadius: '16px', overflow: 'hidden' }}>
      {connectionState === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>🎲</div>
          <h3 style={{ color: '#fff', margin: 0 }}>Ready to connect?</h3>
          <p style={{ color: '#999', margin: 0, fontSize: '14px' }}>Match with someone random based on interests</p>
        </div>
      )}
      {(connectionState === 'searching' || connectionState === 'reconnecting') && renderSearching()}
      {connectionState === 'connecting' && renderConnecting()}
      {connectionState === 'connected' && renderConnected()}
    </div>
  );
};

export default RandomMatcher;
