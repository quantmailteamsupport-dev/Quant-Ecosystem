// ============================================================================
// QuantMax - Gift Panel Component
// Gift selection grid with diamond prices, send animation, balance display,
// top-up button, recently sent gifts, combo counter for repeat sends
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface GiftItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  animation: 'float' | 'explode' | 'rain' | 'spin' | 'grow' | 'pulse';
}

interface RecentGift {
  id: string;
  giftId: string;
  giftName: string;
  giftIcon: string;
  senderName: string;
  timestamp: number;
  combo: number;
}

interface GiftPanelProps {
  diamondBalance: number;
  onSendGift: (giftId: string, combo: number) => void;
  onTopUp: () => void;
  recentGifts: RecentGift[];
  recipientName: string;
  isVisible: boolean;
  onClose: () => void;
}

const GIFT_CATALOG: GiftItem[] = [
  { id: 'rose', name: 'Rose', icon: '🌹', price: 1, animation: 'float' },
  { id: 'heart', name: 'Heart', icon: '❤️', price: 5, animation: 'pulse' },
  { id: 'rocket', name: 'Rocket', icon: '🚀', price: 50, animation: 'explode' },
  { id: 'diamond', name: 'Diamond', icon: '💎', price: 100, animation: 'spin' },
  { id: 'castle', name: 'Castle', icon: '🏰', price: 500, animation: 'grow' },
  { id: 'universe', name: 'Universe', icon: '🌌', price: 1000, animation: 'rain' },
];

export const GiftPanel: React.FC<GiftPanelProps> = ({
  diamondBalance,
  onSendGift,
  onTopUp,
  recentGifts,
  recipientName,
  isVisible,
  onClose,
}) => {
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const [comboCount, setComboCount] = useState<number>(0);
  const [lastSentGiftId, setLastSentGiftId] = useState<string | null>(null);
  const [sendAnimation, setSendAnimation] = useState<boolean>(false);
  const [animationGift, setAnimationGift] = useState<GiftItem | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState<boolean>(false);
  const [comboTimer, setComboTimer] = useState<number>(0);

  const comboTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedGiftData = useMemo(() => {
    return GIFT_CATALOG.find(g => g.id === selectedGift) || null;
  }, [selectedGift]);

  const canAfford = useMemo(() => {
    if (!selectedGiftData) return false;
    return diamondBalance >= selectedGiftData.price;
  }, [selectedGiftData, diamondBalance]);

  const recentGiftsSorted = useMemo(() => {
    return [...recentGifts].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [recentGifts]);

  // Combo timer countdown
  useEffect(() => {
    if (comboCount > 0) {
      setComboTimer(5);
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
      comboTimerRef.current = setInterval(() => {
        setComboTimer(prev => {
          if (prev <= 1) {
            if (comboTimerRef.current) clearInterval(comboTimerRef.current);
            setComboCount(0);
            setLastSentGiftId(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    };
  }, [comboCount]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    };
  }, []);

  const handleSelectGift = useCallback((giftId: string) => {
    setSelectedGift(giftId);
    setInsufficientFunds(false);
  }, []);

  const handleSendGift = useCallback(() => {
    if (!selectedGift || !selectedGiftData) return;

    if (!canAfford) {
      setInsufficientFunds(true);
      setTimeout(() => setInsufficientFunds(false), 2000);
      return;
    }

    // Calculate combo
    let newCombo = 1;
    if (lastSentGiftId === selectedGift && comboCount > 0) {
      newCombo = comboCount + 1;
    }
    setComboCount(newCombo);
    setLastSentGiftId(selectedGift);

    // Trigger send animation
    setAnimationGift(selectedGiftData);
    setSendAnimation(true);
    animationTimerRef.current = setTimeout(() => {
      setSendAnimation(false);
      setAnimationGift(null);
    }, 1500);

    onSendGift(selectedGift, newCombo);
  }, [selectedGift, selectedGiftData, canAfford, lastSentGiftId, comboCount, onSendGift]);

  if (!isVisible) return null;

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(20,20,20,0.98)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '16px', zIndex: 100 }}>
      {/* Send Animation Overlay */}
      {sendAnimation && animationGift && (
        <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', fontSize: '64px', animation: 'float-up 1.5s ease-out forwards', pointerEvents: 'none', zIndex: 110 }}>
          {animationGift.icon}
          {comboCount > 1 && (
            <span style={{ position: 'absolute', top: '-10px', right: '-20px', background: '#ff2d55', color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
              x{comboCount}
            </span>
          )}
        </div>
      )}

      {/* Header: Balance + Top Up + Close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>💎</span>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>{diamondBalance.toLocaleString()}</span>
          <button
            onClick={onTopUp}
            style={{ background: '#ff2d55', border: 'none', borderRadius: '12px', padding: '4px 12px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            Top Up
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#999', fontSize: '13px' }}>To: {recipientName}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {/* Gift Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {GIFT_CATALOG.map(gift => (
          <div
            key={gift.id}
            onClick={() => handleSelectGift(gift.id)}
            style={{
              background: selectedGift === gift.id ? 'rgba(255,45,85,0.2)' : 'rgba(255,255,255,0.05)',
              border: selectedGift === gift.id ? '2px solid #ff2d55' : '2px solid transparent',
              borderRadius: '12px',
              padding: '12px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '32px' }}>{gift.icon}</span>
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: '500' }}>{gift.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '10px' }}>💎</span>
              <span style={{ color: '#aaa', fontSize: '11px' }}>{gift.price}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Combo Counter */}
      {comboCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ color: '#ff2d55', fontWeight: 'bold', fontSize: '16px' }}>
            Combo x{comboCount}!
          </span>
          <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${(comboTimer / 5) * 100}%`, height: '100%', background: '#ff2d55', transition: 'width 1s linear' }} />
          </div>
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSendGift}
        disabled={!selectedGift}
        style={{
          width: '100%',
          padding: '14px',
          background: selectedGift ? (canAfford ? '#ff2d55' : '#666') : '#333',
          border: 'none',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: selectedGift ? 'pointer' : 'not-allowed',
          marginBottom: '16px',
          transition: 'background 0.2s',
        }}
      >
        {insufficientFunds ? 'Not enough diamonds!' : selectedGift ? `Send ${selectedGiftData?.icon} (${selectedGiftData?.price} 💎)` : 'Select a gift'}
      </button>

      {/* Recently Sent Gifts */}
      {recentGiftsSorted.length > 0 && (
        <div>
          <h4 style={{ color: '#999', margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase' }}>Recently Sent</h4>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {recentGiftsSorted.map(rg => (
              <div key={rg.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '14px' }}>{rg.giftIcon}</span>
                <span style={{ color: '#ccc', fontSize: '11px' }}>{rg.senderName}</span>
                {rg.combo > 1 && (
                  <span style={{ color: '#ff2d55', fontSize: '10px', fontWeight: 'bold' }}>x{rg.combo}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftPanel;
