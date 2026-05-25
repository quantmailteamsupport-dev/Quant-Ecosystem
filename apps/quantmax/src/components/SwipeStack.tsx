// ============================================================================
// QuantMax - Swipe Stack Component
// Physics-based card stack with drag gestures, spring-back animation,
// fly-off-screen on threshold, like/nope/super-like indicators
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface CardProfile {
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
  promptAnswers?: { question: string; answer: string }[];
}

interface SwipeStackProps {
  cards: CardProfile[];
  onSwipe: (cardId: string, direction: 'like' | 'nope' | 'superlike') => void;
  onCardTap: (cardId: string) => void;
  onStackEmpty: () => void;
  disabled?: boolean;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  velocityX: number;
  velocityY: number;
  lastTimestamp: number;
}

interface AnimationState {
  isAnimating: boolean;
  targetX: number;
  targetY: number;
  rotation: number;
  opacity: number;
  type: 'spring-back' | 'fly-off' | 'none';
}

const SWIPE_THRESHOLD = 120;
const SUPERLIKE_THRESHOLD = -100;
const ROTATION_FACTOR = 0.12;
const SPRING_DURATION = 300;
const FLY_DURATION = 400;
const MAX_ROTATION = 25;

export const SwipeStack: React.FC<SwipeStackProps> = ({
  cards,
  onSwipe,
  onCardTap,
  onStackEmpty,
  disabled = false,
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    velocityX: 0,
    velocityY: 0,
    lastTimestamp: 0,
  });

  const [animation, setAnimation] = useState<AnimationState>({
    isAnimating: false,
    targetX: 0,
    targetY: 0,
    rotation: 0,
    opacity: 1,
    type: 'none',
  });

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [indicatorOpacity, setIndicatorOpacity] = useState<number>(0);
  const [indicatorType, setIndicatorType] = useState<'like' | 'nope' | 'superlike' | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartTimeRef = useRef<number>(0);

  const visibleCards = useMemo(() => {
    return cards.slice(currentIndex, currentIndex + 3);
  }, [cards, currentIndex]);

  const offsetX = dragState.currentX - dragState.startX;
  const offsetY = dragState.currentY - dragState.startY;
  const rotation = Math.min(Math.max(offsetX * ROTATION_FACTOR, -MAX_ROTATION), MAX_ROTATION);

  const getSwipeDirection = useCallback((): 'like' | 'nope' | 'superlike' | null => {
    if (offsetY < SUPERLIKE_THRESHOLD && Math.abs(offsetX) < SWIPE_THRESHOLD) {
      return 'superlike';
    }
    if (offsetX > SWIPE_THRESHOLD) {
      return 'like';
    }
    if (offsetX < -SWIPE_THRESHOLD) {
      return 'nope';
    }
    return null;
  }, [offsetX, offsetY]);

  useEffect(() => {
    const direction = getSwipeDirection();
    setIndicatorType(direction);
    if (direction === 'like') {
      setIndicatorOpacity(Math.min((offsetX - SWIPE_THRESHOLD * 0.5) / (SWIPE_THRESHOLD * 0.5), 1));
    } else if (direction === 'nope') {
      setIndicatorOpacity(Math.min((-offsetX - SWIPE_THRESHOLD * 0.5) / (SWIPE_THRESHOLD * 0.5), 1));
    } else if (direction === 'superlike') {
      setIndicatorOpacity(Math.min((-offsetY - SUPERLIKE_THRESHOLD * 0.5) / (Math.abs(SUPERLIKE_THRESHOLD) * 0.5), 1));
    } else {
      setIndicatorOpacity(0);
    }
  }, [offsetX, offsetY, getSwipeDirection]);

  useEffect(() => {
    if (currentIndex >= cards.length && cards.length > 0) {
      onStackEmpty();
    }
  }, [currentIndex, cards.length, onStackEmpty]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || animation.isAnimating) return;
    dragStartTimeRef.current = Date.now();
    setDragState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      velocityX: 0,
      velocityY: 0,
      lastTimestamp: Date.now(),
    });
  }, [disabled, animation.isAnimating]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging) return;
    const now = Date.now();
    const dt = now - dragState.lastTimestamp;
    const vx = dt > 0 ? (e.clientX - dragState.currentX) / dt : 0;
    const vy = dt > 0 ? (e.clientY - dragState.currentY) / dt : 0;

    setDragState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
      velocityX: vx,
      velocityY: vy,
      lastTimestamp: now,
    }));
  }, [dragState.isDragging, dragState.lastTimestamp, dragState.currentX, dragState.currentY]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging) return;
    const direction = getSwipeDirection();
    const timeDelta = Date.now() - dragStartTimeRef.current;

    if (direction) {
      // Fly off screen
      const flyX = direction === 'like' ? 800 : direction === 'nope' ? -800 : 0;
      const flyY = direction === 'superlike' ? -800 : 0;
      const flyRotation = direction === 'like' ? 30 : direction === 'nope' ? -30 : 0;

      setAnimation({
        isAnimating: true,
        targetX: flyX,
        targetY: flyY,
        rotation: flyRotation,
        opacity: 0,
        type: 'fly-off',
      });

      animationTimerRef.current = setTimeout(() => {
        const cardId = visibleCards[0]?.id;
        if (cardId) {
          onSwipe(cardId, direction);
        }
        setCurrentIndex(prev => prev + 1);
        setAnimation({ isAnimating: false, targetX: 0, targetY: 0, rotation: 0, opacity: 1, type: 'none' });
        setDragState(prev => ({ ...prev, isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 }));
      }, FLY_DURATION);
    } else {
      // Spring back to center
      if (timeDelta < 200 && Math.abs(offsetX) < 10 && Math.abs(offsetY) < 10) {
        // Tap detected
        const cardId = visibleCards[0]?.id;
        if (cardId) onCardTap(cardId);
      }

      setAnimation({
        isAnimating: true,
        targetX: 0,
        targetY: 0,
        rotation: 0,
        opacity: 1,
        type: 'spring-back',
      });

      animationTimerRef.current = setTimeout(() => {
        setAnimation({ isAnimating: false, targetX: 0, targetY: 0, rotation: 0, opacity: 1, type: 'none' });
      }, SPRING_DURATION);

      setDragState(prev => ({ ...prev, isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 }));
    }
  }, [dragState.isDragging, getSwipeDirection, visibleCards, onSwipe, onCardTap, offsetX, offsetY]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || animation.isAnimating) return;
    const touch = e.touches[0];
    dragStartTimeRef.current = Date.now();
    setDragState({
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      velocityX: 0,
      velocityY: 0,
      lastTimestamp: Date.now(),
    });
  }, [disabled, animation.isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.isDragging) return;
    const touch = e.touches[0];
    const now = Date.now();
    const dt = now - dragState.lastTimestamp;
    const vx = dt > 0 ? (touch.clientX - dragState.currentX) / dt : 0;
    const vy = dt > 0 ? (touch.clientY - dragState.currentY) / dt : 0;

    setDragState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      velocityX: vx,
      velocityY: vy,
      lastTimestamp: now,
    }));
  }, [dragState.isDragging, dragState.lastTimestamp, dragState.currentX, dragState.currentY]);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  const getTopCardStyle = useCallback((): React.CSSProperties => {
    if (animation.isAnimating) {
      if (animation.type === 'fly-off') {
        return {
          transform: `translate(${animation.targetX}px, ${animation.targetY}px) rotate(${animation.rotation}deg)`,
          opacity: animation.opacity,
          transition: `all ${FLY_DURATION}ms cubic-bezier(0.2, 0, 0.7, 1)`,
          zIndex: 10,
        };
      }
      if (animation.type === 'spring-back') {
        return {
          transform: 'translate(0px, 0px) rotate(0deg)',
          opacity: 1,
          transition: `all ${SPRING_DURATION}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
          zIndex: 10,
        };
      }
    }
    if (dragState.isDragging) {
      return {
        transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
        cursor: 'grabbing',
        zIndex: 10,
        transition: 'none',
      };
    }
    return { transform: 'translate(0px, 0px) rotate(0deg)', cursor: 'grab', zIndex: 10 };
  }, [animation, dragState.isDragging, offsetX, offsetY, rotation]);

  const getStackCardStyle = useCallback((stackIndex: number): React.CSSProperties => {
    const scale = 1 - stackIndex * 0.05;
    const translateY = stackIndex * 8;
    return {
      transform: `translateY(${translateY}px) scale(${scale})`,
      zIndex: 10 - stackIndex,
      opacity: stackIndex < 2 ? 1 : 0.5,
    };
  }, []);

  const renderCard = useCallback((card: CardProfile, index: number) => {
    const isTop = index === 0;
    const style = isTop ? getTopCardStyle() : getStackCardStyle(index);

    return (
      <div
        key={card.id}
        className="swipe-stack-card"
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          userSelect: 'none',
          ...style,
        }}
        onMouseDown={isTop ? handleMouseDown : undefined}
        onMouseMove={isTop ? handleMouseMove : undefined}
        onMouseUp={isTop ? handleMouseUp : undefined}
        onMouseLeave={isTop && dragState.isDragging ? handleMouseUp : undefined}
        onTouchStart={isTop ? handleTouchStart : undefined}
        onTouchMove={isTop ? handleTouchMove : undefined}
        onTouchEnd={isTop ? handleTouchEnd : undefined}
      >
        {/* Card Image */}
        <div
          style={{
            width: '100%',
            height: '75%',
            backgroundImage: `url(${card.photos[0] || '/placeholder-profile.jpg'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {/* Like Indicator */}
          {isTop && indicatorType === 'like' && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                left: '30px',
                border: '4px solid #00d48e',
                borderRadius: '8px',
                padding: '8px 16px',
                transform: 'rotate(-20deg)',
                opacity: indicatorOpacity,
              }}
            >
              <span style={{ color: '#00d48e', fontSize: '32px', fontWeight: 'bold' }}>LIKE</span>
            </div>
          )}

          {/* Nope Indicator */}
          {isTop && indicatorType === 'nope' && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: '30px',
                border: '4px solid #ff4458',
                borderRadius: '8px',
                padding: '8px 16px',
                transform: 'rotate(20deg)',
                opacity: indicatorOpacity,
              }}
            >
              <span style={{ color: '#ff4458', fontSize: '32px', fontWeight: 'bold' }}>NOPE</span>
            </div>
          )}

          {/* Super Like Indicator */}
          {isTop && indicatorType === 'superlike' && (
            <div
              style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                border: '4px solid #00bfff',
                borderRadius: '8px',
                padding: '8px 16px',
                opacity: indicatorOpacity,
              }}
            >
              <span style={{ color: '#00bfff', fontSize: '28px', fontWeight: 'bold' }}>SUPER LIKE</span>
            </div>
          )}

          {/* Verified badge */}
          {card.verified && (
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: '#1da1f2',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#fff', fontSize: '14px' }}>✓</span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div style={{ padding: '16px', background: '#fff', height: '25%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
              {card.displayName}, {card.age}
            </h3>
          </div>
          {card.job && (
            <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>{card.job}</p>
          )}
          {card.school && (
            <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>{card.school}</p>
          )}
          <p style={{ margin: '4px 0', color: '#999', fontSize: '13px' }}>
            {card.distance} km away
          </p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {card.interests.slice(0, 4).map((interest) => (
              <span
                key={interest}
                style={{
                  background: '#f0f0f0',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: '#555',
                }}
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }, [
    getTopCardStyle, getStackCardStyle, handleMouseDown, handleMouseMove,
    handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd,
    dragState.isDragging, indicatorType, indicatorOpacity,
  ]);

  if (visibleCards.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>💫</div>
        <h2 style={{ color: '#333', marginBottom: '8px' }}>No More Profiles</h2>
        <p style={{ color: '#666', textAlign: 'center' }}>Check back later for more matches in your area</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="swipe-stack-container"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
        height: '560px',
        margin: '0 auto',
      }}
    >
      {visibleCards.map((card, index) => renderCard(card, index)).reverse()}
    </div>
  );
};

export default SwipeStack;
